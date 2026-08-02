import "./style.css";
import { keccak256, toBytes, type Hex } from "viem";
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
    allowlist: `0x${string}`[];
    maxAmount: string;
    intentAmount: string;
  }
> = {
  fassets: {
    hint: "Fee payouts: only approved fee wallets, under a hard limit.",
    allowlist: [
      "0x1111111111111111111111111111111111111111",
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ],
    maxAmount: "1000000",
    intentAmount: "500000",
  },
  bot: {
    hint: "Team payroll: automation can pay only the people you approve.",
    allowlist: ["0x2222222222222222222222222222222222222222"],
    maxAmount: "5000000",
    intentAmount: "2500000",
  },
  ftso: {
    hint: "Rewards: partner rewards go only to the locked payout wallet.",
    allowlist: ["0x3333333333333333333333333333333333333333"],
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

const OUTSIDER = "0x9999999999999999999999999999999999999999" as const;

let policy: Policy | null = null;
let lastSig = "";
let toastTimer = 0;
let currentView: ViewId = "landing";
let workspace: Workspace | null = null;
let vaultState: VaultState = "checking";

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
const modeBadge = document.querySelector<HTMLElement>("#modeBadge")!;
const appNav = document.querySelector<HTMLElement>("#appNav")!;
const teamChip = document.querySelector<HTMLElement>("#teamChip")!;
const activityList = document.querySelector<HTMLElement>("#activityList")!;
const workspaceModal = document.querySelector<HTMLElement>("#workspaceModal")!;
const teamNameInput = document.querySelector<HTMLInputElement>("#teamName")!;
const statusDetails = document.querySelector<HTMLDetailsElement>("#statusDetails")!;
const statusTech = document.querySelector<HTMLElement>("#statusTech")!;
const statusActions = document.querySelector<HTMLElement>("#statusActions")!;
const modeLabel = document.querySelector<HTMLElement>("#modeLabel")!;
const vaultAction = document.querySelector<HTMLButtonElement>("#vaultAction")!;
const liveCfg = liveConfig();

function vaultPrefersLive(): boolean {
  const pref = localStorage.getItem(VAULT_PREF_KEY);
  if (pref === "local") return false;
  if (pref === "live") return true;
  return Boolean(liveCfg);
}

function usingLive(): boolean {
  return vaultState === "live" && Boolean(liveCfg);
}

function showVaultActions(show: boolean) {
  statusActions.hidden = !show;
}

function refreshVaultUi() {
  modeBadge.dataset.mode =
    vaultState === "live"
      ? "live"
      : vaultState === "checking"
        ? "checking"
        : vaultState === "unreachable"
          ? "down"
          : "preview";

  const labels: Record<VaultState, string> = {
    checking: "Checking",
    live: "Live",
    local: "Offline",
    unreachable: "Down",
    unavailable: "Local",
  };
  modeLabel.textContent = labels[vaultState];

  if (!liveCfg || vaultState === "unavailable") {
    vaultAction.hidden = true;
    vaultAction.disabled = true;
    return;
  }

  vaultAction.hidden = false;
  vaultAction.disabled = vaultState === "checking";
  if (vaultState === "live") {
    vaultAction.textContent = "Disconnect";
    vaultAction.title = "Disconnect vault and work offline";
  } else if (vaultState === "checking") {
    vaultAction.textContent = "Connecting…";
    vaultAction.title = "Checking vault";
  } else {
    vaultAction.textContent = "Connect";
    vaultAction.title = "Connect to the secure vault";
  }

  refreshDashboard();
}

async function connectVault(opts?: { quiet?: boolean }) {
  if (!liveCfg) {
    vaultState = "unavailable";
    refreshVaultUi();
    return false;
  }
  localStorage.setItem(VAULT_PREF_KEY, "live");
  vaultState = "checking";
  refreshVaultUi();
  showVaultActions(false);

  const ok = await probeVault(liveCfg.baseUrl);
  vaultState = ok ? "live" : "unreachable";
  refreshVaultUi();

  if (ok) {
    if (!opts?.quiet) toast("Vault connected");
    if (currentView !== "landing") {
      setStatus(
        "ok",
        "Vault connected",
        "Live signing is ready. Lock rules, then send a payout."
      );
    }
    return true;
  }

  if (currentView !== "landing") {
    setStatus(
      "bad",
      "Vault unreachable",
      "The secure vault is offline right now. Connect when it is back, or work offline with the same rules.",
      "Could not reach vault /info",
      { vaultActions: true }
    );
  }
  return false;
}

function disconnectVault(opts?: { quiet?: boolean }) {
  localStorage.setItem(VAULT_PREF_KEY, "local");
  vaultState = liveCfg ? "local" : "unavailable";
  refreshVaultUi();
  showVaultActions(false);
  if (!opts?.quiet) toast("Working offline");
  if (currentView !== "landing") {
    setStatus(
      "idle",
      "Working offline",
      "Same payout rules run in this browser. Press Connect when the vault is back."
    );
  }
}

async function initVault() {
  if (!liveCfg) {
    vaultState = "unavailable";
    refreshVaultUi();
    return;
  }
  if (!vaultPrefersLive()) {
    disconnectVault({ quiet: true });
    return;
  }
  await connectVault({ quiet: true });
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
  teamChip.hidden = false;
  teamChip.textContent = ws.team;
  const homeSub = document.querySelector("#homeSub");
  if (homeSub) {
    homeSub.textContent = `${ws.role} · ${ws.team}`;
  }
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
  return {
    title: "Something went wrong",
    body: "We could not complete that request. See technical details if you need to debug.",
    tech,
  };
}

function setStatus(
  kind: "idle" | "ok" | "bad",
  title: string,
  body: string,
  tech?: string,
  opts?: { vaultActions?: boolean }
) {
  const hide = currentView === "landing";
  statusEl.hidden = hide;
  if (hide) return;
  statusEl.dataset.kind = kind;
  statusTitle.textContent = title;
  statusBody.textContent = body;
  if (tech) {
    statusDetails.hidden = false;
    statusDetails.open = false;
    statusTech.textContent = tech;
  } else {
    statusDetails.hidden = true;
    statusDetails.open = false;
    statusTech.textContent = "";
  }
  showVaultActions(Boolean(opts?.vaultActions));
  copySigBtn.hidden = !(kind === "ok" && lastSig);
  statusEl.classList.remove("is-updating");
  void statusEl.offsetWidth;
  statusEl.classList.add("is-updating");
}

function addActivity(kind: "ok" | "bad" | "idle", title: string, body: string) {
  const empty = activityList.querySelector(".activity-empty");
  if (empty) empty.remove();
  const li = document.createElement("li");
  li.dataset.kind = kind;
  li.innerHTML = `<strong>${title}</strong><span>${body}</span><time>${new Date().toLocaleTimeString()}</time>`;
  activityList.prepend(li);
}

function sync() {
  const ready = Boolean(policy) || usingLive();
  trySignBtn.disabled = !ready;
  tryBadBtn.disabled = !ready;
  tryWrongBtn.disabled = !ready;
  refreshDashboard();
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
  const dashVault = document.querySelector("#dashVault");
  const dashVaultMeta = document.querySelector("#dashVaultMeta");
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

  if (vaultState === "live") {
    dashVault!.textContent = "Live";
    dashVaultMeta!.textContent = "Connected on Flare";
  } else if (vaultState === "checking") {
    dashVault!.textContent = "Checking";
    dashVaultMeta!.textContent = "Looking for vault…";
  } else if (vaultState === "unreachable") {
    dashVault!.textContent = "Down";
    dashVaultMeta!.textContent = "Connect when vault is back";
  } else {
    dashVault!.textContent = "Offline";
    dashVaultMeta!.textContent = "Same rules, local session";
  }

  document.querySelectorAll<HTMLElement>("#checklist li").forEach((li) => {
    const step = li.dataset.step;
    li.classList.toggle("done", step === "1" || (step === "2" && Boolean(policy)));
    if (step === "1") li.classList.add("done");
    if (step === "2") li.classList.toggle("done", Boolean(policy));
  });
}

function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function parseAllowlist(raw: string): `0x${string}`[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean) as `0x${string}`[];
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
  const recipient = (
    document.querySelector<HTMLInputElement>("#intentRecipient")!.value || ""
  ).trim() as `0x${string}`;
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
  if (!workspace && id !== "landing") {
    openWorkspaceModal();
    return;
  }
  if (workspace && id === "landing") {
    id = "home";
  }

  currentView = id;
  document.querySelectorAll<HTMLElement>(".view").forEach((el) => {
    el.hidden = el.id !== `view-${id}`;
  });
  document.querySelectorAll<HTMLElement>(".app-nav-item").forEach((el) => {
    const nav = el.dataset.nav === "home" ? "home" : el.dataset.nav;
    el.classList.toggle("active", nav === id || (id === "landing" && nav === "home"));
  });
  appNav.hidden = !workspace;
  statusEl.hidden = id === "landing";
  refreshDashboard();

  if (id === "rules" && !policy) {
    setStatus("idle", "Set your rules", "Choose who can get paid and the spending limit, then lock.");
  } else if (id === "send" && !policy && !usingLive()) {
    setStatus("idle", "Lock rules first", "Go to Rules, lock them, then come back to send.");
  } else if (id === "home" && workspace) {
    setStatus(
      "idle",
      policy ? "Ready to send" : "Next: lock rules",
      policy
        ? "Rules are locked. Send a payout when you are ready."
        : "Open Rules to set who can get paid and your spending limit."
    );
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
  document.querySelector<HTMLInputElement>("#allowlist")!.value =
    s.allowlist.join(", ");
  document.querySelector<HTMLInputElement>("#intentRecipient")!.value =
    s.allowlist[0];
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
  if (currentView !== "landing") {
    setStatus("idle", "Ready", "Lock the rules, then send a payout.");
  }
}

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

document.querySelector("#startTeam")?.addEventListener("click", () => {
  openWorkspaceModal();
});

document.querySelector("#confirmWorkspace")?.addEventListener("click", () => {
  const team = teamNameInput.value.trim() || "My team";
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
    const id = (raw === "home" && !workspace ? "landing" : raw) as ViewId;
    if (raw === "home" && workspace) showView("home");
    else if (raw === "home" && !workspace) showView("landing");
    else showView(id);
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
  if (lastSig) void copyText(lastSig, "Proof copied");
});

document.querySelector("#maxAmount")!.addEventListener("input", () => {
  refreshHints();
  refreshDashboard();
});
document.querySelector("#intentAmount")!.addEventListener("input", refreshHints);
document.querySelector("#allowlist")!.addEventListener("input", refreshDashboard);

setPolicyBtn.addEventListener("click", async () => {
  const input = document.querySelector<HTMLInputElement>("#allowlist")!;
  const next = readPolicy();
  const valid =
    next.allowedRecipients.length > 0 &&
    next.allowedRecipients.length <= 5 &&
    next.allowedRecipients.every(isAddress);
  input.classList.toggle("invalid", !valid);
  if (!valid) {
    setStatus(
      "bad",
      "Check the list",
      "Add 1 to 5 valid wallet addresses, separated by commas."
    );
    return;
  }

  setPolicyBtn.classList.add("busy");
  setPolicyBtn.disabled = true;
  try {
    if (usingLive() && liveCfg) {
      const res = await sendDirectInstruction({
        baseUrl: liveCfg.baseUrl,
        apiKey: liveCfg.apiKey,
        opType: "KEY",
        opCommand: "SET_POLICY",
        originalMessage: encodePolicy(next),
      });
      if (res.status !== 1) {
        setStatus("bad", "Could not lock", res.log ?? "Rules were refused.");
        addActivity("bad", "Lock failed", res.log ?? "Rules refused");
        return;
      }
    }
    policy = next;
    lastSig = "";
    policyChip.textContent = "Locked";
    policyChip.className = "chip ok";
    signChip.textContent = "Waiting";
    signChip.className = "chip";
    sync();
    const summary = `${next.allowedRecipients.length} approved · limit ${next.maxAmount.toLocaleString("en-US")}`;
    setStatus("ok", "Rules locked", summary);
    addActivity("ok", "Rules locked", summary);
    toast("Rules locked");
    showView("send");
  } catch (e) {
    const msg = humanizeError(e);
    vaultState = "unreachable";
    refreshVaultUi();
    setStatus("bad", msg.title, msg.body, msg.tech, { vaultActions: true });
    addActivity("bad", msg.title, msg.body);
  } finally {
    setPolicyBtn.classList.remove("busy");
    setPolicyBtn.disabled = false;
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
  const intent = readIntent();
  intentInput.classList.toggle("invalid", !isAddress(intent.recipient));
  if (!isAddress(intent.recipient)) {
    setStatus("bad", "Check pay-to", "That address does not look valid.");
    return;
  }

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
      lastSig = res.data ?? "";
      signChip.textContent = "Approved";
      signChip.className = "chip ok";
      setStatus(
        "ok",
        "Payout approved",
        `${fmt(intent.amount.toString())} to ${short(intent.recipient)}`
      );
      addActivity(
        "ok",
        "Payout approved",
        `${fmt(intent.amount.toString())} to ${short(intent.recipient)}`
      );
      document.querySelector('#checklist li[data-step="3"]')?.classList.add("done");
      toast("Payout approved");
      return;
    }

    if (!policy) return;
    const err = check(policy, intent);
    if (err) {
      lastSig = "";
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
    lastSig = sig;
    signChip.textContent = "Approved";
    signChip.className = "chip ok";
    setStatus(
      "ok",
      "Payout approved",
      `${intent.amount.toLocaleString("en-US")} to ${short(intent.recipient)}`
    );
    addActivity(
      "ok",
      "Payout approved",
      `${fmt(intent.amount.toString())} to ${short(intent.recipient)}`
    );
    document.querySelector('#checklist li[data-step="3"]')?.classList.add("done");
    toast("Payout approved");
  } catch (e) {
    lastSig = "";
    signChip.textContent = "Error";
    signChip.className = "chip bad";
    const msg = humanizeError(e);
    vaultState = "unreachable";
    refreshVaultUi();
    setStatus("bad", msg.title, msg.body, msg.tech, { vaultActions: true });
    addActivity("bad", msg.title, msg.body);
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
    OUTSIDER;
  trySignBtn.click();
});

document.querySelector('.preset[data-expire="0"]')?.classList.add("active");
refreshHints();

vaultAction.addEventListener("click", () => {
  if (vaultState === "live") disconnectVault();
  else void connectVault();
});

document.querySelector("#retryVault")!.addEventListener("click", () => {
  void connectVault();
});

document.querySelector("#goOffline")!.addEventListener("click", () => {
  disconnectVault();
});

workspace = loadWorkspace();
if (workspace) {
  saveWorkspace(workspace);
  showView("home");
} else {
  showView("landing");
}
refreshVaultUi();
sync();
void initVault();
