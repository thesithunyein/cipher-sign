/**
 * One-time: set InstructionSender._extensionId on Coston2 using tee/.env PRIVATE_KEY.
 * Avoids the expensive registry scan in the product wallet UX.
 *
 *   node scripts/set-extension-id.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

function loadEnv(path) {
  const out = {};
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 0) continue;
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
  } catch {
    /* missing ok */
  }
  return out;
}

const teeEnv = loadEnv(resolve(root, "tee/.env"));
const extEnv = loadEnv(resolve(root, "tee/config/extension.env"));
const pkRaw = teeEnv.PRIVATE_KEY || process.env.PRIVATE_KEY;
const sender =
  extEnv.INSTRUCTION_SENDER ||
  teeEnv.INSTRUCTION_SENDER ||
  "0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9";
const extHex =
  extEnv.EXTENSION_ID ||
  teeEnv.EXTENSION_ID ||
  "0x0000000000000000000000000000000000000000000000000000000000000665";

if (!pkRaw) {
  console.error("Missing PRIVATE_KEY in tee/.env");
  process.exit(1);
}

const pk = pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`;
const account = privateKeyToAccount(pk);
const extensionId = BigInt(extHex);

const chain = {
  id: 114,
  name: "Coston2",
  nativeCurrency: { name: "C2FLR", symbol: "C2FLR", decimals: 18 },
  rpcUrls: { default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] } },
};

const abi = parseAbi([
  "function _extensionId() view returns (uint256)",
  "function setExtensionId() external",
  "function discoverExtensionId() external",
  "function setExtensionId(uint256 id) external",
]);

const publicClient = createPublicClient({
  chain,
  transport: http("https://coston2-api.flare.network/ext/C/rpc"),
});
const walletClient = createWalletClient({
  account,
  chain,
  transport: http("https://coston2-api.flare.network/ext/C/rpc"),
});

const current = await publicClient.readContract({
  address: sender,
  abi,
  functionName: "_extensionId",
});
console.log("InstructionSender", sender);
console.log("wallet", account.address);
console.log("current _extensionId", current.toString());
console.log("target EXTENSION_ID", extensionId.toString());

if (current !== 0n) {
  console.log("Already set — nothing to do.");
  process.exit(0);
}

// Deployed bytecode only has the no-arg scanner (old ABI). Use that.
const { request } = await publicClient.simulateContract({
  account,
  address: sender,
  abi,
  functionName: "setExtensionId",
});
const gas = await publicClient.estimateGas({
  account,
  to: sender,
  data: request.data,
});
const gasPrice = await publicClient.getGasPrice();
console.log(
  "estimated cost",
  formatEther(gas * gasPrice),
  "C2FLR · gas",
  gas.toString()
);

const hash = await walletClient.writeContract(request);
console.log("tx", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("status", receipt.status);
const after = await publicClient.readContract({
  address: sender,
  abi,
  functionName: "_extensionId",
});
console.log("new _extensionId", after.toString());
if (after === 0n) {
  console.error("FAILED — still 0");
  process.exit(1);
}
console.log("OK — product Lock can skip activate scan");
