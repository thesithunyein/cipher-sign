/** CipherSign handlers — policy-gated KEY ops for Flare FCC. */

import http from "node:http";
import { Framework } from "../base/types.js";
import {
  VERSION,
  OP_TYPE_KEY,
  OP_COMMAND_UPDATE,
  OP_COMMAND_SIGN,
  OP_COMMAND_SET_POLICY,
} from "./config.js";
import {
  abiEncodeTwo,
  abiDecodePolicy,
  abiDecodeIntent,
  type SignPolicy,
} from "./abi.js";
import { signECDSA, parsePrivateKey } from "./crypto.js";
import { hexToBytes, bytesToHex } from "../base/encoding.js";

/** Mutable state — the framework serializes all handler calls. */
let privateKey: Uint8Array | null = null;
let policy: SignPolicy | null = null;
let signPort = "9090";

/** Set the sign port for communicating with the TEE node. */
export function setSignPort(port: string): void {
  signPort = port;
}

/** Register the KEY handlers with the framework. */
export function register(framework: Framework): void {
  framework.handle(OP_TYPE_KEY, OP_COMMAND_UPDATE, handleKeyUpdate);
  framework.handle(OP_TYPE_KEY, OP_COMMAND_SET_POLICY, handleSetPolicy);
  framework.handle(OP_TYPE_KEY, OP_COMMAND_SIGN, handleKeySign);
}

/** Return a JSON-serializable snapshot of the current state. */
export function reportState(): unknown {
  return {
    hasKey: privateKey !== null,
    hasPolicy: policy !== null,
    policy: policy
      ? {
          allowedRecipient: policy.allowedRecipient,
          maxAmount: policy.maxAmount.toString(),
          expiresAt: policy.expiresAt.toString(),
        }
      : null,
    version: VERSION,
    product: "CipherSign",
  };
}

/** Reset state (for testing). */
export function resetState(): void {
  privateKey = null;
  policy = null;
}

/** Expose policy for unit tests. */
export function getPolicy(): SignPolicy | null {
  return policy;
}

async function handleKeyUpdate(
  msg: string
): Promise<[string | null, number, string | null]> {
  if (!msg) {
    return [null, 0, "originalMessage is empty"];
  }

  let ciphertext: Uint8Array;
  try {
    ciphertext = hexToBytes(msg);
  } catch (e) {
    return [null, 0, `invalid hex in originalMessage: ${e}`];
  }

  let keyBytes: Uint8Array;
  try {
    keyBytes = await decryptViaNode(ciphertext);
  } catch (e) {
    return [null, 0, `decryption failed: ${e}`];
  }

  let validatedKey: Uint8Array;
  try {
    validatedKey = parsePrivateKey(keyBytes);
  } catch (e) {
    return [null, 0, `invalid private key: ${e}`];
  }

  privateKey = validatedKey;
  console.log("CipherSign: private key updated");
  return [null, 1, null];
}

async function handleSetPolicy(
  msg: string
): Promise<[string | null, number, string | null]> {
  if (!msg) {
    return [null, 0, "originalMessage is empty"];
  }

  let raw: Uint8Array;
  try {
    raw = hexToBytes(msg);
  } catch (e) {
    return [null, 0, `invalid hex in originalMessage: ${e}`];
  }

  let next: SignPolicy;
  try {
    next = abiDecodePolicy(raw);
  } catch (e) {
    return [null, 0, `invalid policy encoding: ${e}`];
  }

  if (next.allowedRecipient === "0x0000000000000000000000000000000000000000") {
    return [null, 0, "allowedRecipient cannot be zero address"];
  }

  policy = next;
  console.log("CipherSign: policy set", {
    allowedRecipient: next.allowedRecipient,
    maxAmount: next.maxAmount.toString(),
    expiresAt: next.expiresAt.toString(),
  });
  return [null, 1, null];
}

async function handleKeySign(
  msg: string
): Promise<[string | null, number, string | null]> {
  if (privateKey === null) {
    return [null, 0, "no private key stored"];
  }

  if (policy === null) {
    return [null, 0, "no policy set — call SET_POLICY first"];
  }

  if (!msg) {
    return [null, 0, "originalMessage is empty"];
  }

  let msgBytes: Uint8Array;
  try {
    msgBytes = hexToBytes(msg);
  } catch (e) {
    return [null, 0, `invalid hex in originalMessage: ${e}`];
  }

  let intent;
  try {
    intent = abiDecodeIntent(msgBytes);
  } catch (e) {
    return [null, 0, `invalid intent encoding: ${e}`];
  }

  const now = BigInt(Math.floor(Date.now() / 1000));

  if (policy.expiresAt !== 0n && now > policy.expiresAt) {
    return [null, 0, "policy expired"];
  }

  if (intent.deadline !== 0n && now > intent.deadline) {
    return [null, 0, "intent deadline passed"];
  }

  if (
    intent.recipient.toLowerCase() !== policy.allowedRecipient.toLowerCase()
  ) {
    return [null, 0, "recipient not allowed by policy"];
  }

  if (intent.amount > policy.maxAmount) {
    return [null, 0, "amount exceeds policy maxAmount"];
  }

  let sig: Uint8Array;
  try {
    sig = signECDSA(privateKey, msgBytes);
  } catch (e) {
    return [null, 0, `signing failed: ${e}`];
  }

  let encoded: Uint8Array;
  try {
    encoded = abiEncodeTwo(msgBytes, sig);
  } catch (e) {
    return [null, 0, `ABI encoding failed: ${e}`];
  }

  const dataHex = bytesToHex(encoded);
  return [dataHex, 1, null];
}

/**
 * Call the TEE node's /decrypt endpoint.
 * Sends ciphertext as base64-encoded bytes (matching Go's []byte JSON marshaling).
 * Returns the decrypted plaintext bytes.
 */
function decryptViaNode(ciphertext: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${signPort}/decrypt`;
    const body = JSON.stringify({
      encryptedMessage: Buffer.from(ciphertext).toString("base64"),
    });

    const req = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const data = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode !== 200) {
            reject(new Error(`node returned ${res.statusCode}: ${data}`));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            resolve(
              new Uint8Array(Buffer.from(parsed.decryptedMessage, "base64"))
            );
          } catch (e) {
            reject(new Error(`decode response: ${e}`));
          }
        });
      }
    );

    req.on("error", (e) => reject(new Error(`request error: ${e.message}`)));
    req.write(body);
    req.end();
  });
}
