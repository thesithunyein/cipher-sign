/**
 * One-time: set InstructionSender._extensionId on Coston2 using tee/.env PRIVATE_KEY.
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
  encodeFunctionData,
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
const sender = /** @type {`0x${string}`} */ (
  extEnv.INSTRUCTION_SENDER ||
    teeEnv.INSTRUCTION_SENDER ||
    "0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9"
);

if (!pkRaw) {
  console.error("Missing PRIVATE_KEY in tee/.env");
  process.exit(1);
}

const pk = /** @type {`0x${string}`} */ (
  pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`
);
const account = privateKeyToAccount(pk);

const chain = {
  id: 114,
  name: "Coston2",
  nativeCurrency: { name: "C2FLR", symbol: "C2FLR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
  },
};

// Deployed contract: only the no-arg scanner exists today.
const abi = parseAbi([
  "function _extensionId() view returns (uint256)",
  "function setExtensionId()",
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

if (current !== 0n) {
  console.log("Already set — nothing to do.");
  process.exit(0);
}

const data = encodeFunctionData({
  abi,
  functionName: "setExtensionId",
});

const gas = await publicClient.estimateGas({
  account: account.address,
  to: sender,
  data,
});
const gasPrice = await publicClient.getGasPrice();
const cost = gas * gasPrice;
console.log("estimated cost", formatEther(cost), "C2FLR · gas", gas.toString());

const balance = await publicClient.getBalance({ address: account.address });
if (balance < cost) {
  console.error(
    `Need ~${formatEther(cost)} C2FLR, wallet has ${formatEther(balance)}`
  );
  process.exit(1);
}

const hash = await walletClient.sendTransaction({
  to: sender,
  data,
  gas: (gas * 12n) / 10n,
});
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
console.log("OK");
