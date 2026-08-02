/**
 * Coston2 on-chain path: wallet → InstructionSender.setPolicy / .sign
 * → TeeExtensionRegistry → CipherSign TEE → poll /action/result.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  type Address,
  type Hex,
  type TransactionReceipt,
  type WalletClient,
} from "viem";

export const COSTON2_ID = 114;

export const coston2 = defineChain({
  id: COSTON2_ID,
  name: "Flare Coston2",
  nativeCurrency: { decimals: 18, name: "C2FLR", symbol: "C2FLR" },
  rpcUrls: {
    default: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Coston2 Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
});

export const instructionSenderAbi = [
  {
    type: "function",
    name: "setPolicy",
    stateMutability: "payable",
    inputs: [{ name: "_policy", type: "bytes" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "sign",
    stateMutability: "payable",
    inputs: [{ name: "_message", type: "bytes" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "setExtensionId",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "setExtensionId",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "discoverExtensionId",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "_extensionId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type Env = Record<string, string | undefined>;

function env(): Env {
  return (import.meta as ImportMeta & { env: Env }).env;
}

export type ChainConfig = {
  instructionSender: `0x${string}`;
  rpcUrl: string;
  explorerUrl: string;
  feeWei: bigint;
  chainId: number;
};

export function chainConfig(): ChainConfig | null {
  const e = env();
  const instructionSender = (e.VITE_INSTRUCTION_SENDER ||
    "0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9") as `0x${string}`;
  if (!/^0x[a-fA-F0-9]{40}$/.test(instructionSender)) return null;
  const feeRaw = e.VITE_FEE_WEI || "1000000000000";
  let feeWei: bigint;
  try {
    feeWei = BigInt(feeRaw);
  } catch {
    feeWei = 1_000_000_000_000n;
  }
  return {
    instructionSender,
    rpcUrl: e.VITE_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc",
    explorerUrl:
      e.VITE_EXPLORER_URL || "https://coston2-explorer.flare.network",
    feeWei,
    chainId: Number(e.VITE_CHAIN_ID || COSTON2_ID),
  };
}

export function explorerTxUrl(explorerBase: string, txHash: Hex): string {
  return `${explorerBase.replace(/\/$/, "")}/tx/${txHash}`;
}

export function explorerAddressUrl(
  explorerBase: string,
  address: `0x${string}`
): string {
  return `${explorerBase.replace(/\/$/, "")}/address/${address}`;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;
    };
  }
}

export function hasWallet(): boolean {
  return Boolean(window.ethereum);
}

export async function connectWallet(): Promise<{
  address: Address;
  walletClient: WalletClient;
  account: Address;
}> {
  if (!window.ethereum) {
    throw new Error("Install MetaMask (or another Coston2 wallet) to continue.");
  }
  const cfg = chainConfig();
  if (!cfg) throw new Error("InstructionSender address is not configured.");

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts?.[0]) throw new Error("No wallet account selected.");

  await ensureCoston2(cfg);

  const walletClient = createWalletClient({
    chain: coston2,
    transport: custom(window.ethereum),
  });
  const [address] = await walletClient.getAddresses();
  if (!address) throw new Error("Wallet returned no address.");

  return {
    address,
    walletClient,
    account: address,
  };
}

async function ensureCoston2(cfg: ChainConfig) {
  if (!window.ethereum) return;
  const hexId = `0x${cfg.chainId.toString(16)}`;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName: "Flare Testnet Coston2",
            nativeCurrency: {
              name: "C2FLR",
              symbol: "C2FLR",
              decimals: 18,
            },
            rpcUrls: [cfg.rpcUrl],
            blockExplorerUrls: [cfg.explorerUrl],
          },
        ],
      });
      return;
    }
    throw err;
  }
}

export function publicClientFrom(cfg: ChainConfig) {
  return createPublicClient({
    chain: coston2,
    transport: http(cfg.rpcUrl),
  });
}

/** Instruction id is Topics[2] on TeeInstructionsSent (Flare registry). */
export function instructionIdFromReceipt(
  receipt: TransactionReceipt
): Hex | null {
  for (const log of receipt.logs) {
    if (log.topics.length >= 3 && log.topics[2]) {
      return log.topics[2] as Hex;
    }
  }
  return null;
}

export type OnchainInstructionResult = {
  txHash: Hex;
  instructionId: Hex;
  explorerTx: string;
};

function configuredExtensionId(): bigint | null {
  const raw = env().VITE_EXTENSION_ID;
  if (!raw) return null;
  try {
    const id = BigInt(raw);
    return id > 0n ? id : null;
  } catch {
    return null;
  }
}

/**
 * One-time on-chain bind: InstructionSender → Flare extension id.
 * Prefers cheap setExtensionId(id) when VITE_EXTENSION_ID is set (new contracts).
 * Falls back to registry scan (can cost several C2FLR on busy Coston2).
 */
export async function ensureExtensionIdOnchain(opts: {
  walletClient: WalletClient;
  account: Address;
}): Promise<{ alreadySet: boolean; txHash?: Hex; explorerTx?: string }> {
  const cfg = chainConfig();
  if (!cfg) throw new Error("Chain config missing");
  const publicClient = publicClientFrom(cfg);

  const extId = await publicClient.readContract({
    address: cfg.instructionSender,
    abi: instructionSenderAbi,
    functionName: "_extensionId",
  });
  if (extId !== 0n) {
    return { alreadySet: true };
  }

  const knownId = configuredExtensionId();
  const balance = await publicClient.getBalance({ address: opts.account });

  try {
    if (knownId != null) {
      try {
        const hash = await opts.walletClient.writeContract({
          chain: coston2,
          account: opts.account,
          address: cfg.instructionSender,
          abi: instructionSenderAbi,
          functionName: "setExtensionId",
          args: [knownId],
        });
        return finishExtensionId(publicClient, cfg, hash);
      } catch {
        /* old deployed bytecode has no uint256 overload — fall through */
      }
    }

    // Preflight cost of registry scan (old InstructionSender.setExtensionId()).
    const { request } = await publicClient.simulateContract({
      account: opts.account,
      address: cfg.instructionSender,
      abi: instructionSenderAbi,
      functionName: "setExtensionId",
      args: [],
    });
    const gas = await publicClient.estimateContractGas({
      account: opts.account,
      address: cfg.instructionSender,
      abi: instructionSenderAbi,
      functionName: "setExtensionId",
      args: [],
    });
    const gasPrice = await publicClient.getGasPrice();
    const cost = gas * gasPrice;
    if (balance < cost) {
      const need = (Number(cost) / 1e18).toFixed(3);
      const have = (Number(balance) / 1e18).toFixed(3);
      throw new Error(
        `Activate needs ~${need} C2FLR for the one-time registry scan, but this wallet only has ${have} C2FLR. Fund from https://faucet.flare.network/ then retry — or run: node web/scripts/set-extension-id.mjs`
      );
    }

    // Human-readable cost warning (MetaMask may show red “high fee” — that is expected).
    console.info(
      `[CipherSign] setExtensionId scan ≈ ${(Number(cost) / 1e18).toFixed(3)} C2FLR — confirm in MetaMask even if fee is red`
    );

    const hash = await opts.walletClient.writeContract(request);
    return finishExtensionId(publicClient, cfg, hash);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("extension id not found")) {
      throw new Error(
        "Extension not registered for this InstructionSender. From tee/: ./scripts/post-build.sh (or re-run pre-build + register)."
      );
    }
    throw e;
  }
}

async function finishExtensionId(
  publicClient: ReturnType<typeof publicClientFrom>,
  cfg: ChainConfig,
  hash: Hex
): Promise<{ alreadySet: boolean; txHash: Hex; explorerTx: string }> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("setExtensionId transaction reverted on Coston2");
  }
  const after = await publicClient.readContract({
    address: cfg.instructionSender,
    abi: instructionSenderAbi,
    functionName: "_extensionId",
  });
  if (after === 0n) {
    throw new Error(
      "setExtensionId mined but extension id is still 0 — contract may not be registered as this extension’s InstructionSender."
    );
  }
  return {
    alreadySet: false,
    txHash: hash,
    explorerTx: explorerTxUrl(cfg.explorerUrl, hash),
  };
}

/** Operator-sponsored on-chain InstructionSender — user pays $0 gas. */
export async function sendSponsoredInstruction(opts: {
  op: "setPolicy" | "sign";
  message: Hex;
}): Promise<OnchainInstructionResult> {
  const res = await fetch("/api/instruct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: opts.op, message: opts.message }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    txHash?: Hex;
    instructionId?: Hex;
    explorerTx?: string;
  };
  if (!res.ok) {
    throw new Error(body.error || `Sponsor API HTTP ${res.status}`);
  }
  if (!body.txHash || !body.instructionId || !body.explorerTx) {
    throw new Error("Sponsor API returned an incomplete result");
  }
  return {
    txHash: body.txHash,
    instructionId: body.instructionId,
    explorerTx: body.explorerTx,
  };
}

export async function sendSetPolicyOnchain(opts: {
  policyBytes: Hex;
  walletClient?: WalletClient | null;
  account?: Address | null;
}): Promise<OnchainInstructionResult> {
  try {
    return await sendSponsoredInstruction({
      op: "setPolicy",
      message: opts.policyBytes,
    });
  } catch (sponsoredErr) {
    if (!opts.walletClient || !opts.account) throw sponsoredErr;
    // Fallback: user wallet pays (needs C2FLR from faucet).
    const cfg = chainConfig();
    if (!cfg) throw sponsoredErr;
    const publicClient = publicClientFrom(cfg);
    await ensureExtensionIdOnchain({
      walletClient: opts.walletClient,
      account: opts.account,
    });
    const hash = await opts.walletClient.writeContract({
      chain: coston2,
      account: opts.account,
      address: cfg.instructionSender,
      abi: instructionSenderAbi,
      functionName: "setPolicy",
      args: [opts.policyBytes],
      value: cfg.feeWei,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error("setPolicy transaction reverted on Coston2");
    }
    const instructionId = instructionIdFromReceipt(receipt);
    if (!instructionId) {
      throw new Error("Could not read instruction ID from transaction logs");
    }
    return {
      txHash: hash,
      instructionId,
      explorerTx: explorerTxUrl(cfg.explorerUrl, hash),
    };
  }
}

export async function sendSignOnchain(opts: {
  intentBytes: Hex;
  walletClient?: WalletClient | null;
  account?: Address | null;
}): Promise<OnchainInstructionResult> {
  try {
    return await sendSponsoredInstruction({
      op: "sign",
      message: opts.intentBytes,
    });
  } catch (sponsoredErr) {
    if (!opts.walletClient || !opts.account) throw sponsoredErr;
    const cfg = chainConfig();
    if (!cfg) throw sponsoredErr;
    const publicClient = publicClientFrom(cfg);
    await ensureExtensionIdOnchain({
      walletClient: opts.walletClient,
      account: opts.account,
    });
    const hash = await opts.walletClient.writeContract({
      chain: coston2,
      account: opts.account,
      address: cfg.instructionSender,
      abi: instructionSenderAbi,
      functionName: "sign",
      args: [opts.intentBytes],
      value: cfg.feeWei,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error("sign transaction reverted on Coston2");
    }
    const instructionId = instructionIdFromReceipt(receipt);
    if (!instructionId) {
      throw new Error("Could not read instruction ID from transaction logs");
    }
    return {
      txHash: hash,
      instructionId,
      explorerTx: explorerTxUrl(cfg.explorerUrl, hash),
    };
  }
}

export type TeeAttestationKind = "hardware" | "simulated" | "unknown";

export function classifyAttestation(info: unknown): TeeAttestationKind {
  if (!info || typeof info !== "object") return "unknown";
  const o = info as {
    attestation?: string;
    machineData?: { platform?: string };
  };
  const att = (o.attestation || "").toLowerCase();
  const platformHex = o.machineData?.platform || "";
  let platform = "";
  try {
    platform = hexToAscii(platformHex).toUpperCase();
  } catch {
    /* ignore */
  }
  if (att === "magic_pass" || platform.includes("TEST")) return "simulated";
  if (att && att !== "magic_pass") return "hardware";
  return "unknown";
}

function hexToAscii(hex: string): string {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  let out = "";
  for (let i = 0; i < h.length; i += 2) {
    const code = parseInt(h.slice(i, i + 2), 16);
    if (!code) break;
    out += String.fromCharCode(code);
  }
  return out;
}
