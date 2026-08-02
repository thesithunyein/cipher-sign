import "./style.css";
import { getAddress, keccak256, toBytes, type Hex } from "viem";
import {
  encodeIntent,
  encodePolicy,
  liveConfig,
  probeVault,
  sendDirectInstruction,
  type SignIntent,
  type SignPolicy,
} from "./fcc";

type Policy = SignPolicy;
type ViewId = "landing" | "home" | "rules" | "send" | "activity";

type Workspace = { team: string; role: string };

const WS_KEY = "cs-workspace";
const VAULT_PREF_KEY = "cs-vault-mode";

type VaultState = "checking" | "live" | "local" | "unreachable" | "unavailable";

const SCENARIOS: Record<
  string,
  {
    hint: string;
    maxAmount: string;
    intentAmount: string;
  }
> = {
  fassets: {
    hint: "Fee payouts: only approved fee wallets, under a hard limit.",
    maxAmount: "1000000",
    intentAmount: "500000",
  },
  bot: {
    hint: "Team payroll: automation can pay only the people you approve.",
    maxAmount: "5000000",
    intentAmount: "2500000",
  },
  ftso: {
    hint: "Rewards: partner rewards go only to the locked payout wallet.",
    maxAmount: "250000",
    intentAmount: "100000",
  },
};

const ERRORS: Record<string, string> = {
  "no private key stored": "Vault key is not loaded yet.",
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
let proofBlobUrl = "";
let toastTimer = 0;
let workspace: Workspace | null = null;
let vaultState: VaultState = "checking";
let policyLocking = false;

const proofPanel = document.querySelector<HTMLElement>("#proofPanel")!;
const proofIdInput = document.querySelector<HTMLInputElement>("#proofId")!;
const proofLinkInput = document.querySelector<HTMLInputElement>("#proofLink")!;
const proofSigArea = document.querySelector<HTMLTextAreaElement>("#proofSig")!;
const openProofBtn = document.querySelector<HTMLAnchorElement>("#openProof")!;

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

/** App (Home / Rules / Send / Activity) only after vault Connect. */
function isAuthed(): boolean {
  return vaultState === "live" && Boolean(liveCfg);
}

function usingLive(): boolean {
  return isAuthed();
}

function refreshSessionChrome() {
  const authed = isAuthed();
  appNav.hidden = !authed;
  teamChip.hidden = !(authed && workspace);
  if (authed && workspace) teamChip.textContent = workspace.team;

  vaultAction.hidden = false;
  vaultAction.disabled = vaultState === "checking" || !liveCfg;
  if (!liveCfg) {
    vaultAction.textContent = "Unavailable";
    vaultAction.title = "Vault is not configured";
  } else if (vaultState === "checking") {
    vaultAction.textContent = "Connecting…";
    vaultAction.title = "Connecting";
  } else if (authed) {
    vaultAction.textContent = "Disconnect";
    vaultAction.title = "Sign out of vault";
  } else {
    vaultAction.textContent = "Connect";
    vaultAction.title = "Connect secure vault";
  }
}

function refreshVaultUi() {
  refreshSessionChrome();
  if (isAuthed()) refreshDashboard();
}

async function connectVault(opts?: { quiet?: boolean }) {
  if (!liveCfg) {
    vaultState = "unavailable";
    refreshVaultUi();
    if (!opts?.quiet) toast("Vault not configured");
    return false;
  }
  localStorage.setItem(VAULT_PREF_KEY, "live");
  vaultState = "checking";
  refreshVaultUi();

  const ok = await probeVault(liveCfg.baseUrl);
  if (!ok) {
    localStorage.removeItem(VAULT_PREF_KEY);
    vaultState = "unreachable";
    refreshVaultUi();
    if (!opts?.quiet) toast("Could not connect — vault offline");
    showView("landing");
    return false;
  }

  vaultState = "live";
  refreshVaultUi();
  if (!opts?.quiet) toast("Connected");

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
  lastSig = "";
  lastError = "";
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
  if (meta) meta.setAttribute("content", theme === "light" ? "#f7f7f8" : "#07070c");
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
      body: "The secure vault is offline right now. Your rules stay in this browser — try again once the vault is back.",
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
  if (lower.includes("invalid address") || lower.includes("address")) {
    return {
      title: "Invalid address",
      body: "One of the wallet addresses is not valid. Paste a full 0x address from MetaMask.",
      tech,
    };
  }
  return {
    title: "Something went wrong",
    body: tech.slice(0, 220) || "We could not complete that request.",
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

function buildProofReceipt(sig: string, summary: string, proofId: string): string {
  const when = new Date().toISOString();
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>CipherSign approval · ${esc(proofId)}</title>
<style>
  :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { margin: 0; min-height: 100vh; background: #0b1220; color: #e8eefc; padding: 2rem; }
  main { max-width: 40rem; margin: 0 auto; }
  h1 { font-size: 1.35rem; margin: 0 0 .35rem; }
  .muted { color: #9db0d0; font-size: .95rem; line-height: 1.45; }
  .row { margin: 1.25rem 0; }
  .label { display: block; font-size: .75rem; letter-spacing: .04em; text-transform: uppercase; color: #7f95b8; margin-bottom: .35rem; }
  code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; word-break: break-all; }
  .box { background: #121a2b; border: 1px solid #24314a; border-radius: 10px; padding: .85rem 1rem; }
  .ok { color: #7ddea0; }
</style>
</head>
<body>
<main>
  <p class="ok">CipherSign · vault approval proof</p>
  <h1>${esc(summary)}</h1>
  <p class="muted">Signed by the CipherSign Flare TEE vault after locked rules passed. This is vault signature proof (demo <code>/direct</code>), not a Coston2 payment explorer transaction.</p>
  <div class="row"><span class="label">Proof ID</span><div class="box mono">${esc(proofId)}</div></div>
  <div class="row"><span class="label">Approved at (UTC)</span><div class="box mono">${esc(when)}</div></div>
  <div class="row"><span class="label">Full vault signature</span><div class="box mono">${esc(sig)}</div></div>
</main>
</body>
</html>`;
}

function showProof(sig: string, summary: string) {
  lastSig = sig;
  lastProofSummary = summary;
  proofPanel.hidden = !sig;
  if (!sig) {
    hideProof();
    return;
  }
  const proofId = proofIdFromSig(sig);
  proofIdInput.value = proofId;
  proofSigArea.value = sig;
  revokeProofBlob();
  const blob = new Blob([buildProofReceipt(sig, summary, proofId)], {
    type: "text/html",
  });
  proofBlobUrl = URL.createObjectURL(blob);
  proofLinkInput.value = proofBlobUrl;
  openProofBtn.href = proofBlobUrl;
  setStatus("ok", "Payout approved", `${summary} · Proof ID ${proofId}`);
}

function hideProof() {
  proofPanel.hidden = true;
  proofIdInput.value = "";
  proofLinkInput.value = "";
  proofSigArea.value = "";
  lastProofSummary = "";
  openProofBtn.href = "#";
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

function check(p: Policy, intent: SignIntent): string | null {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (p.expiresAt !== 0n && now > p.expiresAt) return "policy expired";
  if (intent.deadline !== 0n && now > intent.deadline)
    return "intent deadline passed";
  const allowed = p.allowedRecipients.some(
    (a) => a.toLowerCase() === intent.recipient.toLowerCase()
  );
  if (!allowed) return "recipient not allowed by policy";
  if (intent.amount > p.maxAmount) return "amount exceeds policy maxAmount";
  return null;
}

function fakeSig(intentHex: Hex) {
  return keccak256(toBytes(`sig:${intentHex}`));
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
    applyScenario(el.dataset.scenario || "fassets");
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
    `Proof ID: ${proofIdInput.value}`,
    `Signature: ${lastSig}`,
    "Note: Flare TEE vault signature via /direct (not a Coston2 payment tx).",
  ].join("\n");
  void copyText(payload, "Full proof copied");
});

document.querySelector("#copyProofId")?.addEventListener("click", () => {
  if (proofIdInput.value) void copyText(proofIdInput.value, "Proof ID copied");
});

document.querySelector("#copyProofLink")?.addEventListener("click", () => {
  if (proofLinkInput.value) void copyText(proofLinkInput.value, "Confirmation link copied");
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
  // Write normalized checksums back into the field.
  input.value = next.allowedRecipients.join(", ");

  policyLocking = true;
  sync();
  try {
    const res = await sendDirectInstruction({
      baseUrl: liveCfg.baseUrl,
      apiKey: liveCfg.apiKey,
      opType: "KEY",
      opCommand: "SET_POLICY",
      originalMessage: encodePolicy(next),
      timeoutMs: 25_000,
    });
    if (res.status !== 1) {
      const log = (res.log ?? "Rules were refused.").replace(/^error:\s*/i, "");
      setStatus("bad", "Could not lock", ERRORS[log] ?? log);
      addActivity("bad", "Lock failed", log);
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
    setStatus("ok", "Rules locked", summary);
    addActivity("ok", "Rules locked", summary);
    toast("Rules locked");
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
  if (!policy && !usingLive()) {
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
    if (usingLive() && liveCfg) {
      const res = await sendDirectInstruction({
        baseUrl: liveCfg.baseUrl,
        apiKey: liveCfg.apiKey,
        opType: "KEY",
        opCommand: "SIGN",
        originalMessage: encodeIntent(intent),
      });
      if (res.status !== 1) {
        lastSig = "";
        hideProof();
        lastSig = "";
        hideProof();
        signChip.textContent = "Refused";
        signChip.className = "chip bad";
        const msg = (res.log ?? "").replace(/^error:\s*/i, "");
        const body =
          ERRORS[msg] ?? res.log ?? "This payout breaks the locked rules.";
        setStatus("bad", "Payout blocked", body);
        addActivity(
          "bad",
          "Payout blocked",
          `${fmt(intent.amount.toString())} to ${short(intent.recipient)} · ${body}`
        );
        document.querySelector('#checklist li[data-step="3"]')?.classList.add("done");
        return;
      }
      const sig = res.data ?? "";
      signChip.textContent = "Approved";
      signChip.className = "chip ok";
      const summary = `${fmt(intent.amount.toString())} to ${short(intent.recipient)}`;
      showProof(sig, summary);
      addActivity(
        "ok",
        "Payout approved",
        `${summary} · proof ${proofIdFromSig(sig) || "saved"}`
      );
      document.querySelector('#checklist li[data-step="3"]')?.classList.add("done");
      toast("Approved — proof ready below");
      return;
    }

    if (!policy) return;
    const err = check(policy, intent);
    if (err) {
      lastSig = "";
      hideProof();
      signChip.textContent = "Refused";
      signChip.className = "chip bad";
      const body = ERRORS[err] ?? err;
      setStatus("bad", "Payout blocked", body);
      addActivity(
        "bad",
        "Payout blocked",
        `${fmt(intent.amount.toString())} to ${short(intent.recipient)} · ${body}`
      );
      document.querySelector('#checklist li[data-step="3"]')?.classList.add("done");
      return;
    }

    const hex = encodeIntent(intent);
    const sig = fakeSig(hex);
    signChip.textContent = "Approved";
    signChip.className = "chip ok";
    const summary = `${fmt(intent.amount.toString())} to ${short(intent.recipient)}`;
    showProof(sig, summary);
    addActivity(
      "ok",
      "Payout approved",
      `${summary} · proof ${proofIdFromSig(sig)}`
    );
    document.querySelector('#checklist li[data-step="3"]')?.classList.add("done");
    toast("Approved — proof ready below");
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
