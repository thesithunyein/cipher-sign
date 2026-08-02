import "./style.css";
import { keccak256, toBytes, type Hex } from "viem";
import {
  encodeIntent,
  encodePolicy,
  liveConfig,
  sendDirectInstruction,
  type SignIntent,
  type SignPolicy,
} from "./fcc";

type Policy = SignPolicy;
type ViewId = "home" | "rules" | "send" | "activity";

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
    hint: "Bot payroll: automation can pay only the ops wallet you approve.",
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
  "recipient not allowed by policy": "That person is not on the approved list.",
  "amount exceeds policy maxAmount": "That amount is over the spending limit.",
};

const OUTSIDER = "0x9999999999999999999999999999999999999999" as const;

let policy: Policy | null = null;
let lastSig = "";
let toastTimer = 0;
let currentView: ViewId = "home";

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
const activityList = document.querySelector<HTMLElement>("#activityList")!;
const live = liveConfig();

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

function setStatus(kind: "idle" | "ok" | "bad", title: string, body: string) {
  statusEl.hidden = currentView === "home";
  statusEl.dataset.kind = kind;
  statusTitle.textContent = title;
  statusBody.textContent = body;
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
  const ready = Boolean(policy) || Boolean(live);
  trySignBtn.disabled = !ready;
  tryBadBtn.disabled = !ready;
  tryWrongBtn.disabled = !ready;
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
  currentView = id;
  document.querySelectorAll<HTMLElement>(".view").forEach((el) => {
    el.hidden = el.id !== `view-${id}`;
  });
  document.querySelectorAll<HTMLElement>("[data-nav]").forEach((el) => {
    if (el instanceof HTMLButtonElement || el.classList.contains("app-nav-item")) {
      el.classList.toggle("active", el.dataset.nav === id);
    }
  });
  appNav.hidden = false;
  statusEl.hidden = id === "home";
  if (id === "home") {
    // keep landing clean
  } else if (id === "rules" && !policy) {
    setStatus("idle", "Set your rules", "Choose who can get paid and the spending limit, then lock.");
  } else if (id === "send" && !policy && !live) {
    setStatus("idle", "Lock rules first", "Go to Rules, lock them, then come back to send.");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  if (currentView !== "home") {
    setStatus("idle", "Ready", "Lock the rules, then send a payout.");
  }
}

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

document.querySelectorAll<HTMLElement>("[data-nav]").forEach((el) => {
  el.addEventListener("click", (e) => {
    const id = el.dataset.nav as ViewId | undefined;
    if (!id) return;
    if (el.tagName === "A") e.preventDefault();
    showView(id);
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
    toast("Using first approved wallet");
  }
});

copySigBtn.addEventListener("click", () => {
  if (lastSig) void copyText(lastSig, "Proof copied");
});

document.querySelector("#maxAmount")!.addEventListener("input", refreshHints);
document.querySelector("#intentAmount")!.addEventListener("input", refreshHints);

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
    if (live) {
      const res = await sendDirectInstruction({
        baseUrl: live.baseUrl,
        apiKey: live.apiKey,
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
    setStatus("bad", "Something went wrong", String(e));
    addActivity("bad", "Lock error", String(e));
  } finally {
    setPolicyBtn.classList.remove("busy");
    setPolicyBtn.disabled = false;
    sync();
  }
});

trySignBtn.addEventListener("click", async () => {
  if (!policy && !live) {
    setStatus("bad", "Lock rules first", "Go to Rules, lock them, then send.");
    showView("rules");
    return;
  }

  const intentInput =
    document.querySelector<HTMLInputElement>("#intentRecipient")!;
  const intent = readIntent();
  intentInput.classList.toggle("invalid", !isAddress(intent.recipient));
  if (!isAddress(intent.recipient)) {
    setStatus("bad", "Check pay-to", "That wallet address does not look valid.");
    return;
  }

  trySignBtn.classList.add("busy");
  trySignBtn.disabled = true;
  try {
    if (live) {
      const res = await sendDirectInstruction({
        baseUrl: live.baseUrl,
        apiKey: live.apiKey,
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
        return;
      }
      lastSig = res.data ?? "";
      signChip.textContent = "Approved";
      signChip.className = "chip ok";
      setStatus(
        "ok",
        "Payout approved",
        "The vault signed this. The rules were followed."
      );
      addActivity(
        "ok",
        "Payout approved",
        `${fmt(intent.amount.toString())} to ${short(intent.recipient)}`
      );
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
    toast("Payout approved");
  } catch (e) {
    lastSig = "";
    signChip.textContent = "Error";
    signChip.className = "chip bad";
    setStatus("bad", "Something went wrong", String(e));
    addActivity("bad", "Send error", String(e));
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
sync();
showView("home");

if (live) {
  modeBadge.dataset.mode = "live";
  modeBadge.textContent = "Live";
  setStatus(
    "idle",
    "Live vault online",
    "Connected on Flare. Open Rules to lock payout controls."
  );
} else {
  modeBadge.dataset.mode = "preview";
  modeBadge.textContent = "Demo";
  setStatus(
    "idle",
    "Demo mode",
    "Same rules as live. Open the app to lock who can get paid and try a payout."
  );
}
