import "./style.css";
import {
  getAddress,
  keccak256,
  toBytes,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import {
  encodeIntent,
  encodePolicy,
  liveConfig,
  pollInstructionResult,
  probeVault,
  type SignIntent,
  type SignPolicy,
} from "./fcc";
import {
  chainConfig,
  classifyAttestation,
  sendSetPolicyOnchain,
  sendSignOnchain,
  sendUpdateKeyOnchain,
  type TeeAttestationKind,
} from "./chain";
import { verifyApproval } from "./verify";

type Policy = SignPolicy;
type ViewId = "landing" | "home" | "rules" | "send" | "activity";

type Workspace = { team: string; role: string };

const WS_KEY = "cs-workspace";
const VAULT_PREF_KEY = "cs-vault-mode";

type VaultState = "checking" | "live" | "unreachable" | "unavailable";

const SCENARIOS: Record<
  string,
  {
    hint: string;
    maxAmount: string;
    intentAmount: string;
  }
> = {
  fees: {
    hint: "Fee wallets only. Hard cap on every payout.",
    maxAmount: "1000000",
    intentAmount: "500000",
  },
  payroll: {
    hint: "Approved teammates only. Never above the payroll cap.",
    maxAmount: "5000000",
    intentAmount: "2500000",
  },
  rewards: {
    hint: "Partner rewards only to wallets you lock in advance.",
    maxAmount: "250000",
    intentAmount: "100000",
  },
};

const ERRORS: Record<string, string> = {
  "no private key stored": "Vault key is not loaded yet.",
  "decryption failed": "Could not decrypt vault key for this TEE. Reconnect and lock again.",
  "invalid private key": "Vault key payload was rejected by the TEE.",
  "policy expired": "These payout rules have ended.",
  "intent deadline passed": "This payout took too long and timed out.",
  "recipient not allowed by policy": "Blocked: that person is not approved.",
  "amount exceeds policy maxAmount": "Blocked: that amount is over your spending limit.",
};

/** Address guaranteed not on the current allowlist (for safety-limit tests only). */
function outsiderAddress(): `0x${string}` {
  const allowed = new Set(
    parseAllowlist(
      document.querySelector<HTMLInputElement>("#allowlist")?.value || ""
    ).map((a) => a.toLowerCase())
  );
  const candidates = [
    "0xffffffffffffffffffffffffffffffffffffffff",
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  ] as const;
  for (const c of candidates) {
    if (!allowed.has(c)) return c;
  }
  return "0xdead000000000000000000000000000000000000";
}

let policy: Policy | null = null;
let lastSig = "";
let lastError = "";
let lastProofSummary = "";
let lastVerifyDetail = "";
let lastRecovered: `0x${string}` | null = null;
let lastTxHash: Hex | null = null;
let lastExplorerTx = "";
let vaultAddress: `0x${string}` | null = null;
let attestationKind: TeeAttestationKind = "unknown";
let walletClient: WalletClient | null = null;
let walletAccount: Address | null = null;
let proofBlobUrl = "";
let toastTimer = 0;
let workspace: Workspace | null = null;
let vaultState: VaultState = "checking";
let policyLocking = false;

const chainCfg = chainConfig();
const proofPanel = document.querySelector<HTMLElement>("#proofPanel")!;
const proofIdInput = document.querySelector<HTMLInputElement>("#proofId")!;
const proofTxInput = document.querySelector<HTMLInputElement>("#proofTx")!;
const proofSignerInput = document.querySelector<HTMLInputElement>("#proofSigner")!;
const proofVerifyInput = document.querySelector<HTMLInputElement>("#proofVerify")!;
const proofChip = document.querySelector<HTMLElement>("#proofChip")!;
const proofExplain = document.querySelector<HTMLElement>("#proofExplain")!;
const proofSigArea = document.querySelector<HTMLTextAreaElement>("#proofSig")!;
const openProofBtn = document.querySelector<HTMLAnchorElement>("#openProof")!;
const openExplorerBtn = document.querySelector<HTMLAnchorElement>("#openExplorer")!;

const policyChip = document.querySelector<HTMLElement>("#policyChip")!;
const signChip = document.querySelector<HTMLElement>("#signChip")!;
const statusEl = document.querySelector<HTMLElement>("#status")!;
const statusTitle = document.querySelector<HTMLElement>("#statusTitle")!;
const statusBody = document.querySelector<HTMLElement>("#statusBody")!;
const setPolicyBtn = document.querySelector<HTMLButtonElement>("#setPolicy")!;
const trySignBtn = document.querySelector<HTMLButtonElement>("#trySign")!;
const tryBadBtn = document.querySelector<HTMLButtonElement>("#tryBad")!;
const tryWrongBtn = document.querySelector<HTMLButtonElement>("#tryWrong")!;
const copySigBtn = document.querySelector<HTMLButtonElement>("#copySig")!;
const toastEl = document.querySelector<HTMLElement>("#toast")!;
const themeToggle = document.querySelector<HTMLButtonElement>("#themeToggle")!;
const maxHint = document.querySelector<HTMLElement>("#maxHint")!;
const amountHint = document.querySelector<HTMLElement>("#amountHint")!;
const scenarioHint = document.querySelector<HTMLElement>("#scenarioHint")!;
const appNav = document.querySelector<HTMLElement>("#appNav")!;
const teamChip = document.querySelector<HTMLElement>("#teamChip")!;
const activityList = document.querySelector<HTMLElement>("#activityList")!;
const workspaceModal = document.querySelector<HTMLElement>("#workspaceModal")!;
const teamNameInput = document.querySelector<HTMLInputElement>("#teamName")!;
const vaultAction = document.querySelector<HTMLButtonElement>("#vaultAction")!;
const liveCfg = liveConfig();

/** App after live vault connect. On-chain Lock/Approve is gas-sponsored (you pay $0). */
function isAuthed(): boolean {
  return vaultState === "live" && Boolean(liveCfg) && Boolean(chainCfg);
}

/**
 * TEE keeps the signing key in memory only — lost on container restart.
 * Sponsor-encrypts the demo vault key and sends InstructionSender.updateKey.
 */
async function ensureVaultKeyLoaded(): Promise<void> {
  if (!liveCfg) throw new Error("Vault not configured");
  setStatus(
    "ok",
    "Loading vault key",
    "InstructionSender.updateKey. Gas sponsored ($0 for you)…"
  );
  const onchain = await sendUpdateKeyOnchain();
  setStatus(
    "ok",
    "Waiting for TEE",
    `Key tx confirmed · polling ${short(onchain.instructionId)}`
  );
  const res = await pollInstructionResult({
    baseUrl: liveCfg.baseUrl,
    instructionId: onchain.instructionId,
    timeoutMs: 180_000,
  });
  if (res.status !== 1) {
    const log = (res.log ?? "Key load refused.").replace(/^error:\s*/i, "");
    throw new Error(ERRORS[log] ?? log);
  }
}

function refreshSessionChrome() {
  const authed = isAuthed();
  appNav.hidden = !authed;
  teamChip.hidden = !(authed && workspace);
  if (authed && workspace) teamChip.textContent = workspace.team;

  vaultAction.hidden = false;
  vaultAction.disabled = vaultState === "checking" || !liveCfg || !chainCfg;
  if (!liveCfg || !chainCfg) {
    vaultAction.textContent = "Unavailable";
    vaultAction.title = "Vault or InstructionSender is not configured";
  } else if (vaultState === "checking") {
    vaultAction.textContent = "Connecting…";
    vaultAction.title = "Connecting vault";
  } else if (authed) {
    vaultAction.textContent = "Disconnect";
    vaultAction.title = "Disconnect vault";
  } else {
    vaultAction.textContent = "Connect";
    vaultAction.title = "Connect CipherSign vault";
  }
}

function refreshVaultUi() {
  refreshSessionChrome();
  if (isAuthed()) refreshDashboard();
}

async function connectVault(opts?: { quiet?: boolean }) {
  if (!liveCfg || !chainCfg) {
    vaultState = "unavailable";
    refreshVaultUi();
    if (!opts?.quiet) toast("Vault / InstructionSender not configured");
    return false;
  }

  localStorage.setItem(VAULT_PREF_KEY, "live");
  vaultState = "checking";
  refreshVaultUi();

  // MetaMask not required — Lock/Approve gas is operator-sponsored.
  walletClient = null;
  walletAccount = null;

  const probe = await probeVault(liveCfg.baseUrl);
  if (!probe.ok) {
    localStorage.removeItem(VAULT_PREF_KEY);
    vaultState = "unreachable";
    vaultAddress = null;
    refreshVaultUi();
    if (!opts?.quiet) toast("Could not connect. Vault offline");
    showView("landing");
    return false;
  }

  vaultAddress = probe.vaultAddress;
  attestationKind = classifyAttestation(probe.info);
  vaultState = "live";
  refreshVaultUi();
  if (!opts?.quiet) {
    const tee =
      attestationKind === "hardware"
        ? "hardware TEE"
        : attestationKind === "simulated"
          ? "simulated TEE"
          : "TEE";
    toast(`Connected · ${tee} · fees covered`);
  }

  if (!workspace) {
    openWorkspaceModal();
    return true;
  }
  showView("home");
  return true;
}

function disconnectVault(opts?: { quiet?: boolean }) {
  localStorage.removeItem(VAULT_PREF_KEY);
  vaultState = liveCfg ? "unreachable" : "unavailable";
  policy = null;
  vaultAddress = null;
  attestationKind = "unknown";
  walletClient = null;
  walletAccount = null;
  lastSig = "";
  lastError = "";
  lastRecovered = null;
  lastVerifyDetail = "";
  lastTxHash = null;
  lastExplorerTx = "";
  hideProof();
  policyChip.textContent = "Not locked";
  policyChip.className = "chip";
  signChip.textContent = "Waiting";
  signChip.className = "chip";
  statusEl.hidden = true;
  refreshVaultUi();
  if (!opts?.quiet) toast("Disconnected");
  showView("landing");
}

async function initVault() {
  if (!liveCfg) {
    vaultState = "unavailable";
    refreshVaultUi();
    showView("landing");
    return;
  }
  if (localStorage.getItem(VAULT_PREF_KEY) === "live") {
    await connectVault({ quiet: true });
    return;
  }
  vaultState = "unreachable";
  refreshVaultUi();
  showView("landing");
}

function toast(message: string) {
  toastEl.hidden = false;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function setTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("cs-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#eef0f8" : "#0a0b12");
}

function currentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function loadWorkspace(): Workspace | null {
  try {
    const raw = localStorage.getItem(WS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Workspace;
    if (!parsed.team) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveWorkspace(ws: Workspace) {
  workspace = ws;
  localStorage.setItem(WS_KEY, JSON.stringify(ws));
  const homeSub = document.querySelector("#homeSub");
  if (homeSub) homeSub.textContent = ws.team;
  refreshSessionChrome();
}

function humanizeError(err: unknown): {
  title: string;
  body: string;
  tech?: string;
} {
  const tech = err instanceof Error ? err.message : String(err);
  const lower = tech.toLowerCase();
  if (
    lower.includes("dns_hostname_not_found") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("non-json") ||
    /\b502\b/.test(lower) ||
    /\b503\b/.test(lower) ||
    /\b504\b/.test(lower)
  ) {
    return {
      title: "Vault unreachable",
      body: "The live vault is offline. Reconnect when it is back. CipherSign does not approve payouts offline.",
      tech,
    };
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return {
      title: "Vault timed out",
      body: "The vault took too long to respond. Check your connection and try again.",
      tech,
    };
  }
  if (
    lower.includes("user rejected") ||
    lower.includes("rejected the request") ||
    lower.includes("denied transaction") ||
    lower.includes("user denied")
  ) {
    return {
      title: "Wallet rejected",
      body: "You rejected the Coston2 transaction in your wallet.",
      tech,
    };
  }
  if (lower.includes("insufficient funds")) {
    return {
      title: "Sponsor needs C2FLR",
      body: "Operator gas wallet is empty. Free testnet C2FLR: https://faucet.flare.network/ (not real money).",
      tech,
    };
  }
  if (lower.includes("sponsor key not configured")) {
    return {
      title: "Sponsor offline",
      body: "Set SPONSOR_PRIVATE_KEY on the host (funded Coston2 key). You should not pay gas in the product path.",
      tech,
    };
  }
  if (
    lower.includes("returned no data") ||
    lower.includes('returned no data ("0x")')
  ) {
    return {
      title: "Contract ABI mismatch",
      body: "InstructionSender simulation expected a return value the contract does not provide. Hard-refresh and retry; if it persists, redeploy the web app.",
      tech,
    };
  }
  if (
    lower.includes("toomany") ||
    lower.includes("0xd65ac61e") ||
    lower.includes("no production tee")
  ) {
    return {
      title: "Vault offline on-chain",
      body: "No production TEE is registered for this extension. Keep the local TEE + public tunnel up, run tee/scripts/post-build.sh, then retry Lock.",
      tech,
    };
  }
  if (
    lower.includes("extension id not found") ||
    lower.includes("not registered for this instructionsender") ||
    lower.includes("extension not registered")
  ) {
    return {
      title: "Extension not registered",
      body: "InstructionSender is not linked on-chain. From tee/ run ./scripts/post-build.sh, then retry Lock.",
      tech,
    };
  }
  if (
    lower.includes("setextensionid") &&
    (lower.includes("revert") || lower.includes("failed"))
  ) {
    return {
      title: "Could not activate contract",
      body: "setExtensionId failed on Coston2. Ensure this InstructionSender is registered to your extension, then retry.",
      tech,
    };
  }
  // Only treat true address-format failures — not every string containing "address".
  if (
    /\binvalid address\b/.test(lower) ||
    /\baddress ["']0x[0-9a-fA-F]*["'] is invalid\b/.test(lower) ||
    lower.includes("is not a valid ethereum address")
  ) {
    return {
      title: "Invalid address",
      body: "One of the wallet addresses is not valid. Paste a full 0x address from MetaMask.",
      tech,
    };
  }
  return {
    title: "Something went wrong",
    body: tech.slice(0, 280) || "We could not complete that request.",
    tech,
  };
}

function proofIdFromSig(sig: string): string {
  if (!sig) return "";
  try {
    return keccak256(toBytes(sig)).slice(0, 18);
  } catch {
    return `${sig.slice(0, 10)}…${sig.slice(-6)}`;
  }
}

function revokeProofBlob() {
  if (proofBlobUrl) {
    URL.revokeObjectURL(proofBlobUrl);
    proofBlobUrl = "";
  }
}

function buildProofReceipt(opts: {
  sig: string;
  summary: string;
  proofId: string;
  verify: string;
  signer: string;
  expectedVault: string;
  explorerTx: string;
  txHash: string;
}): string {
  const when = new Date().toISOString();
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>CipherSign approval · ${esc(opts.proofId)}</title>
<style>
  :root { color-scheme: dark; font-family: "Geist", ui-sans-serif, system-ui, sans-serif; }
  body { margin: 0; min-height: 100vh; background: #07070c; color: #f2f2f5; padding: 2rem; }
  main { max-width: 40rem; margin: 0 auto; }
  h1 { font-size: 1.35rem; margin: 0 0 .35rem; letter-spacing: -0.02em; }
  .muted { color: #a1a1aa; font-size: .95rem; line-height: 1.5; }
  .row { margin: 1.25rem 0; }
  .label { display: block; font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; color: #71717a; margin-bottom: .35rem; }
  .mono { font-family: "Geist Mono", ui-monospace, Menlo, Consolas, monospace; word-break: break-all; }
  .box { background: #121218; border: 1px solid #27272a; border-radius: 8px; padding: .85rem 1rem; }
  .ok { color: #4ade80; } .bad { color: #f87171; }
  a { color: #a78bfa; }
</style>
</head>
<body>
<main>
  <p class="${opts.verify.startsWith("Verified") || opts.verify.startsWith("Recovered") ? "ok" : "bad"}">${esc(opts.verify)}</p>
  <h1>${esc(opts.summary)}</h1>
  <p class="muted">On-chain InstructionSender.sign on Flare Coston2 + policy-gated TEE signature. Explorer tx is the public confirmation; ECDSA recover checks the vault key.</p>
  <div class="row"><span class="label">Coston2 tx</span><div class="box mono"><a href="${esc(opts.explorerTx)}" target="_blank" rel="noreferrer">${esc(opts.txHash || opts.explorerTx || "-")}</a></div></div>
  <div class="row"><span class="label">Vault signer (recovered)</span><div class="box mono">${esc(opts.signer || "-")}</div></div>
  <div class="row"><span class="label">Expected vault</span><div class="box mono">${esc(opts.expectedVault || "not reported by /state yet")}</div></div>
  <div class="row"><span class="label">Proof ID</span><div class="box mono">${esc(opts.proofId)}</div></div>
  <div class="row"><span class="label">Approved at (UTC)</span><div class="box mono">${esc(when)}</div></div>
  <div class="row"><span class="label">Raw approval payload</span><div class="box mono">${esc(opts.sig)}</div></div>
</main>
</body>
</html>`;
}

async function showProof(
  sig: string,
  summary: string,
  explorer?: { txHash: Hex; explorerTx: string }
) {
  lastSig = sig;
  lastProofSummary = summary;
  lastTxHash = explorer?.txHash ?? null;
  lastExplorerTx = explorer?.explorerTx ?? "";
  proofPanel.hidden = !sig;
  if (!sig) {
    hideProof();
    return;
  }

  proofChip.textContent = "Checking…";
  proofChip.className = "chip";
  proofVerifyInput.value = "Recovering signer…";
  proofSignerInput.value = "";
  proofTxInput.value = lastTxHash ?? "";
  openExplorerBtn.href = lastExplorerTx || "#";
  proofIdInput.value = proofIdFromSig(sig);
  proofSigArea.value = sig;

  const verified = await verifyApproval(sig as Hex, vaultAddress);
  lastRecovered = verified.recovered;
  lastVerifyDetail = verified.detail;
  if (verified.recovered && !vaultAddress) {
    vaultAddress = verified.recovered;
  }

  proofVerifyInput.value = verified.detail;
  proofSignerInput.value = verified.recovered ?? "";
  proofChip.textContent = verified.ok
    ? verified.matchesVault === false
      ? "Not verified"
      : "Verified"
    : "Not verified";
  proofChip.className = verified.ok ? "chip ok" : "chip bad";
  proofExplain.textContent = verified.ok
    ? "On-chain InstructionSender tx confirmed; vault signature verified."
    : "On-chain tx may exist, but the vault payload failed cryptographic checks.";

  const proofId = proofIdInput.value;
  revokeProofBlob();
  const blob = new Blob(
    [
      buildProofReceipt({
        sig,
        summary,
        proofId,
        verify: verified.detail,
        signer: verified.recovered ?? "",
        expectedVault: vaultAddress ?? "",
        explorerTx: lastExplorerTx,
        txHash: lastTxHash ?? "",
      }),
    ],
    { type: "text/html" }
  );
  proofBlobUrl = URL.createObjectURL(blob);
  openProofBtn.href = proofBlobUrl;

  setStatus(
    verified.ok ? "ok" : "bad",
    verified.ok ? "Payout approved on-chain" : "Approval failed verification",
    lastExplorerTx
      ? `${summary} · ${verified.detail} · ${lastExplorerTx}`
      : `${summary} · ${verified.detail}`
  );
}

function hideProof() {
  proofPanel.hidden = true;
  proofIdInput.value = "";
  proofTxInput.value = "";
  proofSignerInput.value = "";
  proofVerifyInput.value = "";
  proofSigArea.value = "";
  lastProofSummary = "";
  lastRecovered = null;
  lastVerifyDetail = "";
  lastTxHash = null;
  lastExplorerTx = "";
  proofChip.textContent = "Checking…";
  proofChip.className = "chip";
  openProofBtn.href = "#";
  openExplorerBtn.href = "#";
  revokeProofBlob();
}

function setStatus(
  kind: "idle" | "ok" | "bad",
  title: string,
  body: string,
  tech?: string
) {
  if (kind === "idle" || !isAuthed() || !title || !body) {
    statusEl.hidden = true;
    copySigBtn.hidden = true;
    return;
  }
  statusEl.hidden = false;
  statusEl.dataset.kind = kind;
  statusTitle.textContent = title;
  statusBody.textContent = body;
  if (kind === "bad" && tech) {
    lastError = tech;
    copySigBtn.hidden = false;
    copySigBtn.title = "Copy error details";
  } else if (kind === "ok" && lastSig) {
    lastError = "";
    copySigBtn.hidden = false;
    copySigBtn.title = "Copy approval proof";
  } else {
    copySigBtn.hidden = true;
  }
  statusEl.classList.remove("is-updating");
  void statusEl.offsetWidth;
  statusEl.classList.add("is-updating");
}

function activityTarget(title: string): ViewId {
  const t = title.toLowerCase();
  if (t.includes("rule") || t.includes("lock")) return "rules";
  return "send";
}

function addActivity(kind: "ok" | "bad" | "idle", title: string, body: string) {
  const empty = activityList.querySelector(".activity-empty");
  if (empty) empty.remove();
  const li = document.createElement("li");
  li.dataset.kind = kind;
  const target = activityTarget(title);
  li.dataset.nav = target;
  li.tabIndex = 0;
  li.setAttribute("role", "button");
  li.setAttribute(
    "aria-label",
    `${title}. Open ${target === "rules" ? "Rules" : "Send"}`
  );
  li.innerHTML = `<div class="activity-main"><strong>${title}</strong><span>${body}</span><time>${new Date().toLocaleTimeString()}</time></div><span class="activity-go" aria-hidden="true">Open →</span>`;
  const go = () => showView(target);
  li.addEventListener("click", go);
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  });
  activityList.prepend(li);
}

function sync() {
  const ready = isAuthed() && Boolean(policy);
  trySignBtn.disabled = !ready;
  tryBadBtn.disabled = !ready;
  tryWrongBtn.disabled = !ready;
  // Only disable Lock while a request is in flight — never leave it stuck.
  setPolicyBtn.disabled = policyLocking || !isAuthed();
  setPolicyBtn.classList.toggle("busy", policyLocking);
  if (isAuthed()) refreshDashboard();
}

function fmt(raw: string) {
  try {
    return BigInt(raw || "0").toLocaleString("en-US");
  } catch {
    return "-";
  }
}

function refreshHints() {
  maxHint.textContent = fmt(
    document.querySelector<HTMLInputElement>("#maxAmount")!.value
  );
  amountHint.textContent = fmt(
    document.querySelector<HTMLInputElement>("#intentAmount")!.value
  );
}

function refreshDashboard() {
  const dashRules = document.querySelector("#dashRules");
  const dashRulesMeta = document.querySelector("#dashRulesMeta");
  const dashLimit = document.querySelector("#dashLimit");
  const dashPeople = document.querySelector("#dashPeople");
  if (!dashRules) return;

  if (policy) {
    dashRules.textContent = "Locked";
    dashRulesMeta!.textContent = "Payouts must follow these rules";
    dashLimit!.textContent = policy.maxAmount.toLocaleString("en-US");
    dashPeople!.textContent = String(policy.allowedRecipients.length);
  } else {
    dashRules.textContent = "Not locked";
    dashRulesMeta!.textContent = "Set who can get paid and your limit";
    dashLimit!.textContent = fmt(
      document.querySelector<HTMLInputElement>("#maxAmount")?.value || "0"
    );
    dashPeople!.textContent = String(
      parseAllowlist(
        document.querySelector<HTMLInputElement>("#allowlist")?.value || ""
      ).length
    );
  }

  document.querySelectorAll<HTMLElement>("#checklist li").forEach((li) => {
    const step = li.dataset.step;
    if (step === "1") li.classList.toggle("done", Boolean(policy));
    if (step === "2") li.classList.toggle("done", Boolean(policy));
  });
}

function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/** Normalize to EIP-55 so viem encode never throws on mixed-case paste. */
function normalizeAddress(value: string): `0x${string}` | null {
  if (!isAddress(value)) return null;
  try {
    return getAddress(value);
  } catch {
    try {
      return getAddress(value.toLowerCase() as `0x${string}`);
    } catch {
      return null;
    }
  }
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function parseAllowlist(raw: string): `0x${string}`[] {
  const out: `0x${string}`[] = [];
  for (const part of raw.split(/[\s,]+/)) {
    const t = part.trim();
    if (!t) continue;
    const n = normalizeAddress(t);
    if (n) out.push(n);
  }
  return out;
}

async function copyText(text: string, okMsg: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    toast("Copy failed");
  }
}

function readPolicy(): Policy {
  return {
    allowedRecipients: parseAllowlist(
      document.querySelector<HTMLInputElement>("#allowlist")!.value || ""
    ),
    maxAmount: BigInt(
      document.querySelector<HTMLInputElement>("#maxAmount")!.value || "0"
    ),
    expiresAt: BigInt(
      document.querySelector<HTMLInputElement>("#expiresAt")!.value || "0"
    ),
  };
}

function readIntent(): SignIntent {
  const raw = (
    document.querySelector<HTMLInputElement>("#intentRecipient")!.value || ""
  ).trim();
  const recipient = normalizeAddress(raw) ?? (raw as `0x${string}`);
  const amount = BigInt(
    document.querySelector<HTMLInputElement>("#intentAmount")!.value || "0"
  );
  const deadline = BigInt(
    document.querySelector<HTMLInputElement>("#intentDeadline")!.value || "0"
  );
  return {
    recipient,
    amount,
    deadline,
    payloadHash: keccak256(toBytes(`ciphersign:${recipient}:${amount}`)),
  };
}

function showView(id: ViewId) {
  if (id !== "landing" && !isAuthed()) {
    id = "landing";
  }
  if (isAuthed() && id === "landing") {
    id = workspace ? "home" : "landing";
  }
  if (isAuthed() && !workspace && id !== "landing") {
    openWorkspaceModal();
    return;
  }

  document.querySelectorAll<HTMLElement>(".view").forEach((el) => {
    el.hidden = el.id !== `view-${id}`;
  });
  document.querySelectorAll<HTMLElement>(".app-nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === id);
  });
  // Reset stuck Lock button when opening Rules.
  if (id === "rules") {
    policyLocking = false;
  }
  refreshVaultUi();
  sync();
  if (id === "landing" || statusEl.dataset.kind === "idle") {
    statusEl.hidden = true;
    copySigBtn.hidden = true;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openWorkspaceModal() {
  workspaceModal.hidden = false;
  teamNameInput.focus();
  teamNameInput.select();
}

function closeWorkspaceModal() {
  workspaceModal.hidden = true;
}

function applyScenario(id: string) {
  const s = SCENARIOS[id];
  if (!s) return;
  // Templates only suggest limits — never inject fake demo addresses.
  document.querySelector<HTMLInputElement>("#maxAmount")!.value = s.maxAmount;
  document.querySelector<HTMLInputElement>("#intentAmount")!.value =
    s.intentAmount;
  document.querySelector<HTMLInputElement>("#expiresAt")!.value = "0";
  scenarioHint.textContent = s.hint;
  document.querySelectorAll(".preset").forEach((p) => p.classList.remove("active"));
  document.querySelector('.preset[data-expire="0"]')?.classList.add("active");
  document.querySelectorAll<HTMLElement>("[data-scenario]").forEach((el) => {
    el.classList.toggle("active", el.dataset.scenario === id);
  });
  policy = null;
  lastSig = "";
  policyChip.textContent = "Not locked";
  policyChip.className = "chip";
  signChip.textContent = "Waiting";
  signChip.className = "chip";
  refreshHints();
  sync();
}

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

document.querySelector("#startTeam")?.addEventListener("click", () => {
  void connectVault();
});

document.querySelector("#confirmWorkspace")?.addEventListener("click", () => {
  if (!isAuthed()) {
    closeWorkspaceModal();
    showView("landing");
    toast("Connect first");
    return;
  }
  const team = teamNameInput.value.trim() || "Workspace";
  saveWorkspace({ team, role: "Finance Ops" });
  closeWorkspaceModal();
  showView("home");
  toast(`Welcome, ${team}`);
});

document.querySelector("#cancelWorkspace")?.addEventListener("click", () => {
  closeWorkspaceModal();
});

workspaceModal.addEventListener("click", (e) => {
  if (e.target === workspaceModal) closeWorkspaceModal();
});

document.querySelectorAll<HTMLElement>("[data-nav]").forEach((el) => {
  el.addEventListener("click", (e) => {
    const raw = el.dataset.nav;
    if (!raw) return;
    if (el.tagName === "A") e.preventDefault();
    if (!isAuthed()) {
      showView("landing");
      return;
    }
    showView(raw as ViewId);
  });
});

document.querySelectorAll<HTMLElement>("[data-scenario]").forEach((el) => {
  el.addEventListener("click", () => {
    applyScenario(el.dataset.scenario || "fees");
  });
});

document.querySelectorAll<HTMLButtonElement>(".preset").forEach((btn) => {
  btn.addEventListener("click", () => {
    const seconds = Number(btn.dataset.expire || "0");
    const input = document.querySelector<HTMLInputElement>("#expiresAt")!;
    input.value =
      seconds === 0
        ? "0"
        : String(Math.floor(Date.now() / 1000) + seconds);
    document
      .querySelectorAll(".preset")
      .forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
  });
});

document.querySelector("#copyAllowlist")!.addEventListener("click", () => {
  const v = document.querySelector<HTMLInputElement>("#allowlist")!.value;
  void copyText(v, "Copied");
});

document.querySelector("#matchRecipient")!.addEventListener("click", () => {
  const first = parseAllowlist(
    document.querySelector<HTMLInputElement>("#allowlist")!.value
  )[0];
  if (first) {
    document.querySelector<HTMLInputElement>("#intentRecipient")!.value = first;
    toast("Using first approved person");
  }
});

copySigBtn.addEventListener("click", () => {
  const payload = lastError || lastSig;
  if (payload) void copyText(payload, lastError ? "Error copied" : "Proof copied");
});

document.querySelector("#copyProof")?.addEventListener("click", () => {
  if (!lastSig) return;
  const payload = [
    "CipherSign approval proof",
    `Summary: ${lastProofSummary}`,
    `Coston2 tx: ${lastTxHash ?? ""}`,
    `Explorer: ${lastExplorerTx}`,
    `Verification: ${lastVerifyDetail}`,
    `Vault signer: ${lastRecovered ?? ""}`,
    `Expected vault: ${vaultAddress ?? ""}`,
    `Proof ID: ${proofIdInput.value}`,
    `Payload: ${lastSig}`,
  ].join("\n");
  void copyText(payload, "Proof pack copied");
});

document.querySelector("#copyProofId")?.addEventListener("click", () => {
  if (proofIdInput.value) void copyText(proofIdInput.value, "Proof ID copied");
});

document.querySelector("#copyProofSigner")?.addEventListener("click", () => {
  if (proofSignerInput.value)
    void copyText(proofSignerInput.value, "Vault signer copied");
});

document.querySelector("#maxAmount")!.addEventListener("input", () => {
  refreshHints();
  refreshDashboard();
});
document.querySelector("#intentAmount")!.addEventListener("input", refreshHints);
document.querySelector("#allowlist")!.addEventListener("input", refreshDashboard);

setPolicyBtn.addEventListener("click", async () => {
  if (policyLocking) return;
  if (!isAuthed() || !liveCfg) {
    toast("Connect first");
    showView("landing");
    return;
  }

  const input = document.querySelector<HTMLInputElement>("#allowlist")!;
  const parts = input.value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const next = readPolicy();
  const valid =
    parts.length > 0 &&
    parts.length <= 5 &&
    parts.length === next.allowedRecipients.length &&
    next.allowedRecipients.length <= 5;
  input.classList.toggle("invalid", !valid);
  if (!valid) {
    setStatus(
      "bad",
      "Check the list",
      "Add 1 to 5 valid wallet addresses, separated by commas."
    );
    return;
  }
  input.value = next.allowedRecipients.join(", ");

  policyLocking = true;
  sync();
  try {
    await ensureVaultKeyLoaded();
    setStatus(
      "ok",
      "Submitting on-chain",
      "InstructionSender.setPolicy. Gas sponsored ($0 for you)…"
    );
    const onchain = await sendSetPolicyOnchain({
      policyBytes: encodePolicy(next),
      walletClient,
      account: walletAccount,
    });
    setStatus(
      "ok",
      "Waiting for TEE",
      `Tx confirmed · polling instruction ${short(onchain.instructionId)}`
    );
    const res = await pollInstructionResult({
      baseUrl: liveCfg.baseUrl,
      instructionId: onchain.instructionId,
      timeoutMs: 180_000,
    });
    if (res.status !== 1) {
      const log = (res.log ?? "Rules were refused.").replace(/^error:\s*/i, "");
      setStatus("bad", "Could not lock", ERRORS[log] ?? log, onchain.explorerTx);
      addActivity("bad", "Lock failed", `${log} · ${onchain.explorerTx}`);
      return;
    }
    policy = next;
    lastSig = "";
    hideProof();
    policyChip.textContent = "Locked";
    policyChip.className = "chip ok";
    signChip.textContent = "Waiting";
    signChip.className = "chip";
    const summary = `${next.allowedRecipients.length} approved · limit ${next.maxAmount.toLocaleString("en-US")}`;
    setStatus("ok", "Rules locked on-chain", `${summary} · ${onchain.explorerTx}`);
    addActivity("ok", "Rules locked", `${summary} · ${onchain.txHash}`);
    toast("Rules locked on-chain");
    showView("send");
  } catch (e) {
    const msg = humanizeError(e);
    setStatus("bad", msg.title, msg.body, msg.tech);
    addActivity("bad", msg.title, msg.body);
    toast(msg.title);
  } finally {
    policyLocking = false;
    sync();
  }
});

trySignBtn.addEventListener("click", async () => {
  if (!isAuthed() || !liveCfg) {
    toast("Connect first");
    showView("landing");
    return;
  }
  if (!policy) {
    setStatus("bad", "Lock rules first", "Go to Rules, lock them, then send.");
    showView("rules");
    return;
  }

  const intentInput =
    document.querySelector<HTMLInputElement>("#intentRecipient")!;
  const normalizedPayTo = normalizeAddress(intentInput.value.trim());
  intentInput.classList.toggle("invalid", !normalizedPayTo);
  if (!normalizedPayTo) {
    setStatus("bad", "Check pay-to", "That address does not look valid.");
    return;
  }
  intentInput.value = normalizedPayTo;
  const intent = readIntent();

  trySignBtn.classList.add("busy");
  trySignBtn.disabled = true;
  try {
    const probe = await probeVault(liveCfg.baseUrl, 3000);
    if (probe.vaultAddress) vaultAddress = probe.vaultAddress;
    attestationKind = classifyAttestation(probe.info);

    await ensureVaultKeyLoaded();

    setStatus(
      "ok",
      "Submitting on-chain",
      "InstructionSender.sign. Gas sponsored ($0 for you)…"
    );
    const onchain = await sendSignOnchain({
      intentBytes: encodeIntent(intent),
      walletClient,
      account: walletAccount,
    });
    setStatus(
      "ok",
      "Waiting for TEE",
      `Tx ${short(onchain.txHash)} · polling vault result…`
    );

    const res = await pollInstructionResult({
      baseUrl: liveCfg.baseUrl,
      instructionId: onchain.instructionId,
      timeoutMs: 180_000,
    });
    if (res.status !== 1) {
      lastSig = "";
      hideProof();
      signChip.textContent = "Refused";
      signChip.className = "chip bad";
      const msg = (res.log ?? "").replace(/^error:\s*/i, "");
      const body =
        ERRORS[msg] ?? res.log ?? "This payout breaks the locked rules.";
      setStatus("bad", "Payout blocked", `${body} · ${onchain.explorerTx}`);
      addActivity(
        "bad",
        "Payout blocked",
        `${fmt(intent.amount.toString())} to ${short(intent.recipient)} · ${body} · ${onchain.txHash}`
      );
      document.querySelector('#checklist li[data-step="3"]')?.classList.add("done");
      return;
    }
    const sig = res.data ?? "";
    if (!sig) {
      signChip.textContent = "Error";
      signChip.className = "chip bad";
      setStatus(
        "bad",
        "Empty approval",
        `Vault returned no signature. Tx: ${onchain.explorerTx}`
      );
      return;
    }
    const summary = `${fmt(intent.amount.toString())} to ${short(intent.recipient)}`;
    await showProof(sig, summary, {
      txHash: onchain.txHash,
      explorerTx: onchain.explorerTx,
    });
    const verifiedOk = proofChip.textContent === "Verified";
    signChip.textContent = verifiedOk ? "Approved" : "Unverified";
    signChip.className = verifiedOk ? "chip ok" : "chip bad";
    addActivity(
      verifiedOk ? "ok" : "bad",
      verifiedOk ? "Payout approved" : "Approval unverified",
      `${summary} · ${onchain.txHash} · ${lastVerifyDetail || proofIdFromSig(sig)}`
    );
    document.querySelector('#checklist li[data-step="3"]')?.classList.add("done");
    toast(
      verifiedOk
        ? "Approved on-chain. Open the explorer link in proof"
        : "Tx sent but payload failed verify"
    );
  } catch (e) {
    lastSig = "";
    hideProof();
    signChip.textContent = "Error";
    signChip.className = "chip bad";
    const msg = humanizeError(e);
    setStatus("bad", msg.title, msg.body, msg.tech);
    addActivity("bad", msg.title, msg.body);
    if (msg.title.startsWith("Vault")) {
      toast("Connection lost");
      disconnectVault({ quiet: true });
    }
  } finally {
    trySignBtn.classList.remove("busy");
    sync();
  }
});

tryBadBtn.addEventListener("click", () => {
  const max =
    policy?.maxAmount ??
    BigInt(document.querySelector<HTMLInputElement>("#maxAmount")!.value || "0");
  document.querySelector<HTMLInputElement>("#intentAmount")!.value = (
    max + 1n
  ).toString();
  refreshHints();
  trySignBtn.click();
});

tryWrongBtn.addEventListener("click", () => {
  document.querySelector<HTMLInputElement>("#intentRecipient")!.value =
    outsiderAddress();
  trySignBtn.click();
});

document.querySelector('.preset[data-expire="0"]')?.classList.add("active");
refreshHints();

vaultAction.addEventListener("click", () => {
  if (vaultState === "live") disconnectVault();
  else void connectVault();
});

workspace = loadWorkspace();
showView("landing");
sync();
void initVault().then(() => {
  if (isAuthed() && workspace) showView("home");
  else if (isAuthed() && !workspace) openWorkspaceModal();
  else showView("landing");
  sync();
});
