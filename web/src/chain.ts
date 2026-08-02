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

export async function sendSetPolicyOnchain(opts: {
  walletClient: WalletClient;
  account: Address;
  policyBytes: Hex;
}): Promise<OnchainInstructionResult> {
  const cfg = chainConfig();
  if (!cfg) throw new Error("Chain config missing");
  const publicClient = publicClientFrom(cfg);

  const extId = await publicClient.readContract({
    address: cfg.instructionSender,
    abi: instructionSenderAbi,
    functionName: "_extensionId",
  });
  if (extId === 0n) {
    throw new Error(
      "InstructionSender extension ID is not set on-chain. Run post-build / setExtensionId first."
    );
  }

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

export async function sendSignOnchain(opts: {
  walletClient: WalletClient;
  account: Address;
  intentBytes: Hex;
}): Promise<OnchainInstructionResult> {
  const cfg = chainConfig();
  if (!cfg) throw new Error("Chain config missing");
  const publicClient = publicClientFrom(cfg);

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
