/** ABI encoding/decoding helpers using viem. */

import { encodeAbiParameters, decodeAbiParameters, type Hex } from "viem";
import { bytesToHex, hexToBytes } from "../base/encoding.js";

/**
 * ABI-encode two dynamic byte arrays: (bytes, bytes).
 */
export function abiEncodeTwo(a: Uint8Array, b: Uint8Array): Uint8Array {
  const params = [{ type: "bytes" as const }, { type: "bytes" as const }];
  const encoded = encodeAbiParameters(params, [bytesToHex(a), bytesToHex(b)]);
  return hexToBytes(encoded);
}

/**
 * Decode ABI-encoded (bytes, bytes) back into two byte arrays.
 */
export function abiDecodeTwo(data: Uint8Array): [Uint8Array, Uint8Array] {
  const params = [{ type: "bytes" as const }, { type: "bytes" as const }];
  const [a, b] = decodeAbiParameters(params, bytesToHex(data));
  return [hexToBytes(a as string), hexToBytes(b as string)];
}

/** Policy stored inside the TEE (enforced before SIGN). */
export type SignPolicy = {
  allowedRecipient: `0x${string}`;
  maxAmount: bigint;
  expiresAt: bigint; // unix seconds; 0 = no expiry
};

const policyParams = [
  { type: "address" as const },
  { type: "uint256" as const },
  { type: "uint256" as const },
] as const;

/** Encode policy for SET_POLICY messages. */
export function abiEncodePolicy(policy: SignPolicy): Uint8Array {
  const encoded = encodeAbiParameters(policyParams, [
    policy.allowedRecipient,
    policy.maxAmount,
    policy.expiresAt,
  ]);
  return hexToBytes(encoded);
}

/** Decode policy from SET_POLICY originalMessage. */
export function abiDecodePolicy(data: Uint8Array): SignPolicy {
  const [allowedRecipient, maxAmount, expiresAt] = decodeAbiParameters(
    policyParams,
    bytesToHex(data) as Hex
  );
  return {
    allowedRecipient: allowedRecipient as `0x${string}`,
    maxAmount: maxAmount as bigint,
    expiresAt: expiresAt as bigint,
  };
}

/** Intent encoded in SIGN originalMessage. */
export type SignIntent = {
  recipient: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  payloadHash: `0x${string}`;
};

const intentParams = [
  { type: "address" as const },
  { type: "uint256" as const },
  { type: "uint256" as const },
  { type: "bytes32" as const },
] as const;

export function abiEncodeIntent(intent: SignIntent): Uint8Array {
  const encoded = encodeAbiParameters(intentParams, [
    intent.recipient,
    intent.amount,
    intent.deadline,
    intent.payloadHash,
  ]);
  return hexToBytes(encoded);
}

export function abiDecodeIntent(data: Uint8Array): SignIntent {
  const [recipient, amount, deadline, payloadHash] = decodeAbiParameters(
    intentParams,
    bytesToHex(data) as Hex
  );
  return {
    recipient: recipient as `0x${string}`,
    amount: amount as bigint,
    deadline: deadline as bigint,
    payloadHash: payloadHash as `0x${string}`,
  };
}
