/**
 * Cryptographic verification of CipherSign vault approvals.
 * SIGN returns ABI (bytes intent, bytes signature65). Signature is ECDSA
 * over keccak256(intent) with Ethereum v = 27/28.
 */

import {
  decodeAbiParameters,
  keccak256,
  recoverAddress,
  getAddress,
  type Hex,
} from "viem";

export type ParsedApproval = {
  intentHex: Hex;
  signature: Hex;
  recipient: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  payloadHash: Hex;
};

export type VerifyResult = {
  ok: boolean;
  recovered: `0x${string}` | null;
  matchesVault: boolean | null;
  detail: string;
  parsed: ParsedApproval | null;
};

export function parseApprovalPayload(data: Hex): ParsedApproval {
  const [intentHex, signature] = decodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes" }],
    data
  ) as [Hex, Hex];

  const [recipient, amount, deadline, payloadHash] = decodeAbiParameters(
    [
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "bytes32" },
    ],
    intentHex
  ) as [`0x${string}`, bigint, bigint, Hex];

  return {
    intentHex,
    signature,
    recipient: getAddress(recipient),
    amount,
    deadline,
    payloadHash,
  };
}

export async function verifyApproval(
  data: Hex,
  expectedVault?: `0x${string}` | null
): Promise<VerifyResult> {
  let parsed: ParsedApproval;
  try {
    parsed = parseApprovalPayload(data);
  } catch {
    return {
      ok: false,
      recovered: null,
      matchesVault: null,
      detail: "Payload is not a valid vault approval encoding.",
      parsed: null,
    };
  }

  if (parsed.signature.length !== 132) {
    return {
      ok: false,
      recovered: null,
      matchesVault: null,
      detail: "Signature length is not a 65-byte ECDSA signature.",
      parsed,
    };
  }

  let recovered: `0x${string}`;
  try {
    recovered = await recoverAddress({
      hash: keccak256(parsed.intentHex),
      signature: parsed.signature,
    });
  } catch {
    return {
      ok: false,
      recovered: null,
      matchesVault: null,
      detail: "Could not recover a signer from this signature.",
      parsed,
    };
  }

  if (!expectedVault) {
    return {
      ok: true,
      recovered,
      matchesVault: null,
      detail: `Recovered vault signer ${recovered}. Confirm against your vault address.`,
      parsed,
    };
  }

  const matches =
    recovered.toLowerCase() === getAddress(expectedVault).toLowerCase();
  return {
    ok: matches,
    recovered,
    matchesVault: matches,
    detail: matches
      ? `Verified — signed by vault ${recovered}`
      : `Fail — recovered ${recovered}, expected vault ${getAddress(expectedVault)}`,
    parsed,
  };
}
