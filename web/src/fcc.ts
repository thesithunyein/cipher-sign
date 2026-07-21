/**
 * Live Flare FCC /direct client helpers for CipherSign demo.
 * Used when VITE_DIRECT_URL + VITE_DIRECT_API_KEY are set.
 */

import { encodeAbiParameters, type Hex } from "viem";

export type SignPolicy = {
  allowedRecipient: `0x${string}`;
  maxAmount: bigint;
  expiresAt: bigint;
};

export type SignIntent = {
  recipient: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  payloadHash: Hex;
};

export function encodePolicy(policy: SignPolicy): Hex {
  return encodeAbiParameters(
    [
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    [policy.allowedRecipient, policy.maxAmount, policy.expiresAt]
  );
}

export function encodeIntent(intent: SignIntent): Hex {
  return encodeAbiParameters(
    [
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "bytes32" },
    ],
    [intent.recipient, intent.amount, intent.deadline, intent.payloadHash]
  );
}

/** bytes32-padded ASCII for FCC opType/opCommand fields. */
export function stringToBytes32Hex(s: string): Hex {
  const bytes = new TextEncoder().encode(s);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return (`0x${hex}${"0".repeat(64 - hex.length)}` as Hex);
}

export type DirectResult = {
  status: number;
  data?: string;
  log?: string;
};

/**
 * Call TEE proxy POST /direct (Flare FCC hackathon path).
 * Exact payload shape follows fce-direct-sign /direct convention.
 */
export async function sendDirectInstruction(opts: {
  baseUrl: string;
  apiKey: string;
  opType: string;
  opCommand: string;
  originalMessage: Hex | string;
}): Promise<DirectResult> {
  const url = opts.baseUrl.replace(/\/$/, "") + "/direct";
  const body = {
    opType: stringToBytes32Hex(opts.opType),
    opCommand: stringToBytes32Hex(opts.opCommand),
    originalMessage: opts.originalMessage,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": opts.apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: DirectResult;
  try {
    parsed = JSON.parse(text) as DirectResult;
  } catch {
    throw new Error(`Direct API non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      `Direct API HTTP ${res.status}: ${parsed.log ?? text.slice(0, 200)}`
    );
  }
  return parsed;
}

export function liveConfig(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = (import.meta as ImportMeta & { env: Record<string, string> })
    .env.VITE_DIRECT_URL;
  const apiKey = (import.meta as ImportMeta & { env: Record<string, string> })
    .env.VITE_DIRECT_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}
