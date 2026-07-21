/**
 * Live /direct smoke (run from web/):
 *   node live-direct-smoke.mjs
 *
 * Requires Docker stack on :6674 + DIRECT_API_KEY in tee/.env
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeAbiParameters, keccak256, toBytes } from "viem";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const teeEnv = readFileSync(resolve(root, "tee/.env"), "utf8");
function env(key) {
  const m = teeEnv.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "");
}

// Prefer localhost for record/smoke; ignore stale tunnel URLs in tee/.env unless EXT_PROXY_URL is exported.
const fromEnv = env("EXT_PROXY_URL");
const BASE = (
  process.env.EXT_PROXY_URL ||
  (fromEnv && !/trycloudflare|ngrok|REPLACE/i.test(fromEnv) ? fromEnv : "") ||
  "http://127.0.0.1:6674"
).replace(/\/$/, "");
const API_KEY = process.env.DIRECT_API_KEY || env("DIRECT_API_KEY");
if (!API_KEY) {
  console.error("DIRECT_API_KEY missing in tee/.env");
  process.exit(1);
}

function bytes32(s) {
  const hex = Buffer.from(s, "utf8").toString("hex");
  return `0x${hex}${"0".repeat(64 - hex.length)}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeResult(j) {
  const nested = j.result || j.Result;
  const src = nested && typeof nested === "object" ? nested : j;
  return {
    status: Number(src.status ?? src.Status ?? -1),
    data: src.data ?? src.Data,
    log: src.log ?? src.Log,
  };
}

async function poll(actionId, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(
      `${BASE}/action/result/${actionId}?submissionTag=submit`
    );
    if (res.status === 404 || res.status === 204) {
      await sleep(400);
      continue;
    }
    const j = await res.json();
    const out = normalizeResult(j);
    if (Number.isNaN(out.status) || out.status < 0) {
      await sleep(400);
      continue;
    }
    return out;
  }
  throw new Error(`timeout polling ${actionId}`);
}

async function direct(opType, opCommand, messageHex) {
  const res = await fetch(`${BASE}/direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      opType: bytes32(opType),
      opCommand: bytes32(opCommand),
      message: messageHex,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`/direct ${res.status}: ${text.slice(0, 300)}`);
  const j = JSON.parse(text);
  const id = j?.data?.id || j?.id;
  if (!id) throw new Error(`no action id: ${text.slice(0, 300)}`);
  return poll(id);
}

const info = await (await fetch(`${BASE}/info`)).json();
console.log("LIVE TEE", {
  chainId: info.teeInfo?.chainId,
  extensionId: info.machineData?.extensionId,
  platform: Buffer.from(info.machineData.platform.slice(2), "hex")
    .toString()
    .replace(/\0/g, ""),
  attestation: info.attestation,
});

const recipient = "0x1111111111111111111111111111111111111111";
let hasKey = false;

try {
  const ecies = await import("ecies-geth");
  const encrypt = ecies.encrypt || ecies.default?.encrypt;
  const pub = info.teeInfo.publicKey;
  const uncompressed = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(pub.x.slice(2), "hex"),
    Buffer.from(pub.y.slice(2), "hex"),
  ]);
  const testKey = Buffer.from(
    "fad9c8855b740a0b7ed4c221dbad0f33a83a49cad6b3fe8d5817ac83d38b6a19",
    "hex"
  );
  const ciphertext = await encrypt(uncompressed, testKey);
  const upd = await direct(
    "KEY",
    "UPDATE",
    `0x${Buffer.from(ciphertext).toString("hex")}`
  );
  console.log("UPDATE", upd);
  hasKey = upd.status === 1;
} catch (e) {
  console.warn("UPDATE skipped:", String(e.message || e));
}

const policy = encodeAbiParameters(
  [{ type: "address" }, { type: "uint256" }, { type: "uint256" }],
  [recipient, 1_000_000n, 0n]
);
const setP = await direct("KEY", "SET_POLICY", policy);
console.log("SET_POLICY", setP);

const intent = encodeAbiParameters(
  [
    { type: "address" },
    { type: "uint256" },
    { type: "uint256" },
    { type: "bytes32" },
  ],
  [recipient, 500_000n, 0n, keccak256(toBytes("ciphersign-live"))]
);
const signOk = await direct("KEY", "SIGN", intent);
console.log("SIGN ok-path", signOk);

const bad = encodeAbiParameters(
  [
    { type: "address" },
    { type: "uint256" },
    { type: "uint256" },
    { type: "bytes32" },
  ],
  [recipient, 2_000_000n, 0n, keccak256(toBytes("over-cap"))]
);
const signBad = await direct("KEY", "SIGN", bad);
console.log("SIGN over-cap", signBad);

if (!hasKey) {
  console.log(
    "\nPARTIAL: /direct works. UPDATE failed (ECIES/decrypt). Fix that, then re-run."
  );
  process.exit(1);
}

if (signOk.status !== 1) {
  console.error("FAIL: expected SIGN success");
  process.exit(1);
}
if (signBad.status !== 0) {
  console.error("FAIL: expected over-cap reject");
  process.exit(1);
}
console.log("\nPASS: live policy-gated SIGN on Coston2 TEE stack");
