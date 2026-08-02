/**
 * Operator-sponsored InstructionSender txs (Coston2).
 * User pays $0 gas — SPONSOR_PRIVATE_KEY (or PRIVATE_KEY) pays C2FLR.
 *
 * POST { op: "setPolicy" | "sign", message: "0x..." }
 * → { txHash, instructionId, explorerTx }
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const SENDER =
  process.env.INSTRUCTION_SENDER ||
  process.env.VITE_INSTRUCTION_SENDER ||
  "0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9";
const RPC =
  process.env.CHAIN_URL ||
  process.env.VITE_RPC_URL ||
  "https://coston2-api.flare.network/ext/C/rpc";
const EXPLORER =
  process.env.VITE_EXPLORER_URL || "https://coston2-explorer.flare.network";
const FEE_WEI = BigInt(process.env.FEE_WEI || process.env.VITE_FEE_WEI || "1000000000000");

const abi = parseAbi([
  "function setPolicy(bytes _policy) payable returns (bytes32)",
  "function sign(bytes _message) payable returns (bytes32)",
  "function _extensionId() view returns (uint256)",
]);

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
  const message = body.message;
  if ((op !== "setPolicy" && op !== "sign") || typeof message !== "string" || !message.startsWith("0x")) {
    return json(res, 400, { error: 'Body must be { op: "setPolicy"|"sign", message: "0x…" }' });
  }

  try {
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

    const data = encodeFunctionData({
      abi,
      functionName: op === "setPolicy" ? "setPolicy" : "sign",
      args: [message],
    });

    const hash = await walletClient.sendTransaction({
      to: SENDER,
      data,
      value: FEE_WEI,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      return json(res, 502, { error: "Sponsored transaction reverted", txHash: hash });
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
    const msg = e instanceof Error ? e.message : String(e);
    return json(res, 500, { error: msg.slice(0, 400) });
  }
}
