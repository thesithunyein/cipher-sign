/**
 * Live Flare FCC /direct client for CipherSign vault ops.
 * Requires VITE_DIRECT_URL + VITE_DIRECT_API_KEY.
 *
 * Proxy flow: POST /direct → action id → poll GET /action/result/:id
 */

import { encodeAbiParameters, type Hex } from "viem";

export type SignPolicy = {
  allowedRecipients: `0x${string}`[];
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
      { type: "address[]" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    [policy.allowedRecipients, policy.maxAmount, policy.expiresAt]
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractActionId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (typeof o.id === "string") return o.id;
  const data = o.data;
  if (data && typeof data === "object") {
    const id = (data as Record<string, unknown>).id;
    if (typeof id === "string") return id;
  }
  return null;
}

function normalizeResult(parsed: Record<string, unknown>): DirectResult | null {
  const nested = parsed.result ?? parsed.Result;
  const src =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : parsed;
  if (src.status === undefined && src.Status === undefined) return null;
  const status = Number(src.status ?? src.Status ?? -1);
  const dataRaw = src.data ?? src.Data;
  const logRaw = src.log ?? src.Log;
  let data: string | undefined;
  if (typeof dataRaw === "string") data = dataRaw;
  else if (dataRaw != null) data = String(dataRaw);
  return {
    status,
    data,
    log: typeof logRaw === "string" ? logRaw : undefined,
  };
}

async function pollActionResult(
  baseUrl: string,
  actionId: string,
  timeoutMs = 60_000,
  submissionTag?: string
): Promise<DirectResult> {
  const tag = submissionTag ? `?submissionTag=${submissionTag}` : "";
  const url = `${baseUrl.replace(/\/$/, "")}/action/result/${actionId}${tag}`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(url);
    if (res.status === 404 || res.status === 204) {
      await sleep(500);
      continue;
    }
    const text = await res.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      await sleep(500);
      continue;
    }
    const out = normalizeResult(parsed);
    if (!out || out.status < 0) {
      await sleep(500);
      continue;
    }
    return out;
  }
  throw new Error(`Timed out waiting for action result ${actionId}`);
}

/**
 * Poll TEE result for an on-chain InstructionSender instruction id.
 * (No submissionTag — that tag is only for POST /direct.)
 */
export async function pollInstructionResult(opts: {
  baseUrl: string;
  instructionId: string;
  timeoutMs?: number;
}): Promise<DirectResult> {
  return pollActionResult(
    opts.baseUrl,
    opts.instructionId,
    opts.timeoutMs ?? 180_000
  );
}

/**
 * Call TEE proxy POST /direct, then poll for result.
 */
export async function sendDirectInstruction(opts: {
  baseUrl: string;
  apiKey: string;
  opType: string;
  opCommand: string;
  originalMessage: Hex | string;
  timeoutMs?: number;
}): Promise<DirectResult> {
  const base = opts.baseUrl.replace(/\/$/, "");
  const url = `${base}/direct`;

  // Proxy DirectInstruction uses `message` (bytes hex). Also accept originalMessage for clarity.
  const message =
    typeof opts.originalMessage === "string" &&
    opts.originalMessage.startsWith("0x")
      ? opts.originalMessage
      : opts.originalMessage;

  const body = {
    opType: stringToBytes32Hex(opts.opType),
    opCommand: stringToBytes32Hex(opts.opCommand),
    message,
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Direct API non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const errObj = parsed as DirectResult;
    throw new Error(
      `Direct API HTTP ${res.status}: ${errObj.log ?? text.slice(0, 200)}`
    );
  }

  // Some builds may return the result inline; prefer action-id poll.
  const inline = parsed as DirectResult & { Status?: number };
  if (typeof inline.status === "number" || typeof inline.Status === "number") {
    return {
      status: Number(inline.status ?? inline.Status),
      data: inline.data,
      log: inline.log,
    };
  }

  const actionId = extractActionId(parsed);
  if (!actionId) {
    throw new Error(
      `Direct API missing action id: ${text.slice(0, 240)}`
    );
  }
  return pollActionResult(base, actionId, opts.timeoutMs ?? 60_000, "submit");
}

export function liveConfig(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = (import.meta as ImportMeta & { env: Record<string, string> })
    .env.VITE_DIRECT_URL;
  const apiKey = (import.meta as ImportMeta & { env: Record<string, string> })
    .env.VITE_DIRECT_API_KEY;
  if (!baseUrl || !apiKey) return null;
  // Relative "/fcc" is proxied by Vite to the local TEE (avoids browser CORS).
  return { baseUrl, apiKey };
}

export type VaultProbe = {
  ok: boolean;
  vaultAddress: `0x${string}` | null;
};

export type VaultInfoProbe = VaultProbe & {
  info: unknown | null;
};

/** Reachability + vault signer address from TEE /state when available. */
export async function probeVault(
  baseUrl: string,
  timeoutMs = 5000
): Promise<VaultInfoProbe> {
  const base = baseUrl.replace(/\/$/, "");
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const infoRes = await fetch(`${base}/info`, { signal: ctrl.signal });
    if (!infoRes.ok) return { ok: false, vaultAddress: null, info: null };
    let info: unknown = null;
    try {
      info = await infoRes.json();
    } catch {
      info = null;
    }

    let vaultAddress: `0x${string}` | null = null;
    try {
      const stateRes = await fetch(`${base}/state`, { signal: ctrl.signal });
      if (stateRes.ok) {
        const body = (await stateRes.json()) as {
          state?: { vaultAddress?: string | null };
        };
        const addr = body.state?.vaultAddress;
        if (typeof addr === "string" && addr.startsWith("0x") && addr.length === 42) {
          vaultAddress = addr as `0x${string}`;
        }
      }
    } catch {
      /* /state optional behind some proxies */
    }
    return { ok: true, vaultAddress, info };
  } catch {
    return { ok: false, vaultAddress: null, info: null };
  } finally {
    window.clearTimeout(timer);
  }
}
