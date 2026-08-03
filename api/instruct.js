/**
 * Operator-sponsored InstructionSender txs (Coston2).
 * User pays $0 gas — SPONSOR_PRIVATE_KEY (or PRIVATE_KEY) pays C2FLR.
 *
 * POST { op: "setPolicy" | "sign" | "updateKey", message?: "0x..." }
 * → { txHash, instructionId, explorerTx }
 *
 * updateKey: if message omitted, encrypts the demo vault key under the live TEE
 * pubkey (fetched from TEE_PROXY_URL /fcc/info) and loads it into the vault.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ecies = require("ecies-geth");
const encrypt = ecies.encrypt || ecies.default?.encrypt;

const SENDER =
  process.env.INSTRUCTION_SENDER ||
  process.env.VITE_INSTRUCTION_SENDER ||
  "0x23E9d227a2b1741b8e23915D7F7f592f5FEDe36A";
const RPC =
  process.env.CHAIN_URL ||
  process.env.VITE_RPC_URL ||
  "https://coston2-api.flare.network/ext/C/rpc";
const EXPLORER =
  process.env.VITE_EXPLORER_URL || "https://coston2-explorer.flare.network";
const FEE_WEI = BigInt(process.env.FEE_WEI || process.env.VITE_FEE_WEI || "1000000000000");

/** Same demo vault key as tee run-test / web live-direct-smoke (recoverable for proofs). */
const DEMO_VAULT_KEY_HEX =
  process.env.VAULT_PRIVATE_KEY ||
  "fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19";

const TEE_INFO_BASE = (
  process.env.TEE_PROXY_URL ||
  process.env.EXT_PROXY_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/fcc`
    : "https://cipher-sign.vercel.app/fcc")
).replace(/\/$/, "");

// No returns() — on-chain methods do not return the instruction id
// (viem simulate fails with "returned no data (0x)" if ABI expects bytes32).
const abi = parseAbi([
  "function setPolicy(bytes _policy) payable",
  "function sign(bytes _message) payable",
  "function updateKey(bytes _encryptedKey) payable",
  "function _extensionId() view returns (uint256)",
]);

/** MachineManager.TooMany() — requested more TEEs than are in production for this extension. */
const TOO_MANY_SELECTOR = "0xd65ac61e";

function explainRevert(err) {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (lower.includes(TOO_MANY_SELECTOR) || lower.includes("toomany")) {
    return (
      "No production TEE machine for this extension (TooMany). " +
      "Start the TEE stack, expose it via EXT_PROXY_URL, then run tee/scripts/post-build.sh."
    );
  }
  if (lower.includes("extension id not set") || lower.includes("extension id is 0")) {
    return "InstructionSender extension id is 0. Run: node web/scripts/set-extension-id.mjs";
  }
  return raw.slice(0, 400);
}

const chain = {
  id: 114,
  name: "Coston2",
  nativeCurrency: { name: "C2FLR", symbol: "C2FLR", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, body) {
  cors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function instructionIdFromReceipt(receipt) {
  for (const log of receipt.logs) {
    if (log.topics?.length >= 3 && log.topics[2]) return log.topics[2];
  }
  return null;
}

async function encryptDemoVaultKey() {
  if (typeof encrypt !== "function") {
    throw new Error("ecies-geth encrypt unavailable in API runtime");
  }
  const infoRes = await fetch(`${TEE_INFO_BASE}/info`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!infoRes.ok) {
    throw new Error(
      `TEE /info HTTP ${infoRes.status} from ${TEE_INFO_BASE} — tunnel down or TEE_PROXY_URL stale`
    );
  }
  const info = await infoRes.json();
  const pub = info?.teeInfo?.publicKey;
  if (!pub?.x || !pub?.y) {
    throw new Error("TEE /info missing teeInfo.publicKey");
  }
  const uncompressed = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(String(pub.x).replace(/^0x/, ""), "hex"),
    Buffer.from(String(pub.y).replace(/^0x/, ""), "hex"),
  ]);
  const plaintext = Buffer.from(DEMO_VAULT_KEY_HEX.replace(/^0x/, ""), "hex");
  if (plaintext.length !== 32) {
    throw new Error("VAULT_PRIVATE_KEY must be 32 bytes hex");
  }
  const ciphertext = await encrypt(uncompressed, plaintext);
  return `0x${Buffer.from(ciphertext).toString("hex")}`;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") {
    return json(res, 405, { error: "POST only" });
  }

  const pkRaw = process.env.SPONSOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pkRaw) {
    return json(res, 503, {
      error:
        "Sponsor key not configured. Set SPONSOR_PRIVATE_KEY on Vercel (funded Coston2 key).",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { error: "Invalid JSON" });
    }
  }
  // Vercel may leave body unread on some runtimes
  if (!body || typeof body !== "object") {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      return json(res, 400, { error: "Invalid JSON body" });
    }
  }

  const op = body.op;
  let message = body.message;

  if (op !== "setPolicy" && op !== "sign" && op !== "updateKey") {
    return json(res, 400, {
      error: 'Body must be { op: "setPolicy"|"sign"|"updateKey", message?: "0x…" }',
    });
  }

  try {
    if (op === "updateKey" && (typeof message !== "string" || !message.startsWith("0x"))) {
      message = await encryptDemoVaultKey();
    }
    if (typeof message !== "string" || !message.startsWith("0x")) {
      return json(res, 400, { error: 'message must be hex "0x…"' });
    }

    const pk = pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`;
    const account = privateKeyToAccount(pk);
    const publicClient = createPublicClient({ chain, transport: http(RPC) });
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(RPC),
    });

    const extId = await publicClient.readContract({
      address: SENDER,
      abi,
      functionName: "_extensionId",
    });
    if (extId === 0n) {
      return json(res, 409, {
        error:
          "InstructionSender extension id is 0. Run: node web/scripts/set-extension-id.mjs",
      });
    }

    const functionName =
      op === "setPolicy" ? "setPolicy" : op === "sign" ? "sign" : "updateKey";

    // Simulate first so we return a clear error instead of a blind on-chain revert.
    try {
      await publicClient.simulateContract({
        account: account.address,
        address: SENDER,
        abi,
        functionName,
        args: [message],
        value: FEE_WEI,
      });
    } catch (simErr) {
      return json(res, 502, { error: explainRevert(simErr) });
    }

    const data = encodeFunctionData({
      abi,
      functionName,
      args: [message],
    });

    const hash = await walletClient.sendTransaction({
      to: SENDER,
      data,
      value: FEE_WEI,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      return json(res, 502, {
        error:
          "Sponsored transaction reverted. Usually means no production TEE " +
          "(run tee/scripts/post-build.sh) or the tunnel URL is stale.",
        txHash: hash,
      });
    }
    const instructionId = instructionIdFromReceipt(receipt);
    if (!instructionId) {
      return json(res, 502, {
        error: "No instruction id in receipt",
        txHash: hash,
      });
    }
    return json(res, 200, {
      txHash: hash,
      instructionId,
      explorerTx: `${EXPLORER.replace(/\/$/, "")}/tx/${hash}`,
      sponsor: account.address,
    });
  } catch (e) {
    return json(res, 500, { error: explainRevert(e) });
  }
}
