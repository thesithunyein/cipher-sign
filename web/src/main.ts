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
    hint: "FAssets executor fee vault — allowlisted fee recipient + hard cap.",
    allowlist: [
      "0x1111111111111111111111111111111111111111",
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ],
    maxAmount: "1000000",
    intentAmount: "500000",
  },
  bot: {
    hint: "Flare keeper / bot payout — only the ops wallet can receive signed payouts.",
    allowlist: ["0x2222222222222222222222222222222222222222"],
    maxAmount: "5000000",
    intentAmount: "2500000",
  },
  ftso: {
    hint: "FTSO reward forwarder — provider rewards only to the locked payout address.",
    allowlist: ["0x3333333333333333333333333333333333333333"],
    maxAmount: "250000",
    intentAmount: "100000",
  },
};

const ERRORS: Record<string, string> = {
  "no private key stored": "No key loaded.",
  "policy expired": "Policy expired.",
  "intent deadline passed": "Deadline passed.",
  "recipient not allowed by policy": "Recipient not allowlisted.",
  "amount exceeds policy maxAmount": "Amount exceeds max.",
};

const OUTSIDER = "0x9999999999999999999999999999999999999999" as const;

let policy: Policy | null = null;
let lastSig = "";
let toastTimer = 0;

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
  if (meta) meta.setAttribute("content", theme === "light" ? "#f6f4fb" : "#07070c");
}

function currentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function setStatus(kind: "idle" | "ok" | "bad", title: string, body: string) {
  statusEl.dataset.kind = kind;
  statusTitle.textContent = title;
  statusBody.textContent = body;
  copySigBtn.hidden = !(kind === "ok" && lastSig);
  statusEl.classList.remove("is-updating");
  void statusEl.offsetWidth;
  statusEl.classList.add("is-updating");
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
    return "—";
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
  scenarioHint.classList.remove("is-switching");
  void scenarioHint.offsetWidth;
  scenarioHint.classList.add("is-switching");
  document.querySelectorAll(".panel").forEach((el) => {
    el.classList.remove("is-switching");
    void (el as HTMLElement).offsetWidth;
    el.classList.add("is-switching");
  });
  document.querySelectorAll(".preset").forEach((p) => p.classList.remove("active"));
  document.querySelector('.preset[data-expire="0"]')?.classList.add("active");
  policy = null;
  lastSig = "";
  policyChip.textContent = "Unlocked";
  policyChip.className = "chip";
  signChip.textContent = "Waiting";
  signChip.className = "chip";
  refreshHints();
  sync();
  setStatus("idle", "Ready", "Lock a policy, then sign.");
}

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

document.querySelectorAll<HTMLButtonElement>(".seg").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    applyScenario(btn.dataset.scenario || "fassets");
  });
});

document.querySelectorAll<HTMLButtonElement>(".preset").forEach((btn) => {
  btn.addEventListener("click", () => {
    const seconds = Number(btn.dataset.expire || "0");
    const value =
      seconds === 0 ? "0" : String(Math.floor(Date.now() / 1000) + seconds);
    document.querySelector<HTMLInputElement>("#expiresAt")!.value = value;
    document.querySelectorAll(".preset").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
  });
});

document.querySelector("#copyAllowlist")!.addEventListener("click", () => {
  void copyText(
    document.querySelector<HTMLInputElement>("#allowlist")!.value,
    "Allowlist copied"
  );
});

document.querySelector("#matchRecipient")!.addEventListener("click", () => {
  const list = parseAllowlist(
    document.querySelector<HTMLInputElement>("#allowlist")!.value
  );
  if (list[0]) {
    document.querySelector<HTMLInputElement>("#intentRecipient")!.value =
      list[0];
    toast("Matched first allowlisted address");
  }
});

copySigBtn.addEventListener("click", () => {
  if (lastSig) void copyText(lastSig, "Signature copied");
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
      "Invalid allowlist",
      "Enter 1–5 valid 0x addresses, comma-separated."
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
        setStatus("bad", "Rejected", res.log ?? "Policy rejected.");
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
    setStatus(
      "ok",
      "Policy locked",
      `${next.allowedRecipients.length} addr · max ${next.maxAmount.toLocaleString("en-US")}`
    );
    toast("Policy locked");
  } catch (e) {
    setStatus("bad", "Error", String(e));
  } finally {
    setPolicyBtn.classList.remove("busy");
    setPolicyBtn.disabled = false;
    sync();
  }
});

trySignBtn.addEventListener("click", async () => {
  if (!policy && !live) {
    setStatus("bad", "No policy", "Lock a policy first.");
    return;
  }

  const intentInput =
    document.querySelector<HTMLInputElement>("#intentRecipient")!;
  const intent = readIntent();
  intentInput.classList.toggle("invalid", !isAddress(intent.recipient));
  if (!isAddress(intent.recipient)) {
    setStatus("bad", "Invalid address", "Check the recipient field.");
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
        signChip.textContent = "Rejected";
        signChip.className = "chip bad";
        setStatus("bad", "Blocked", res.log ?? "Request rejected.");
        return;
      }
      lastSig = res.data ?? "";
      signChip.textContent = "Approved";
      signChip.className = "chip ok";
      setStatus("ok", "Signed", "TEE approved this request.");
      toast("Signed");
      return;
    }

    if (!policy) return;
    const err = check(policy, intent);
    if (err) {
      lastSig = "";
      signChip.textContent = "Rejected";
      signChip.className = "chip bad";
      setStatus("bad", "Blocked", ERRORS[err] ?? err);
      return;
    }

    const hex = encodeIntent(intent);
    const sig = fakeSig(hex);
    lastSig = sig;
    signChip.textContent = "Approved";
    signChip.className = "chip ok";
    setStatus(
      "ok",
      "Signed",
      `${intent.amount.toLocaleString("en-US")} → ${short(intent.recipient)}`
    );
    toast("Signed");
  } catch (e) {
    lastSig = "";
    signChip.textContent = "Error";
    signChip.className = "chip bad";
    setStatus("bad", "Error", String(e));
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

if (live) {
  modeBadge.dataset.mode = "live";
  modeBadge.textContent = "Live TEE";
  setStatus(
    "idle",
    "Live Coston2 TEE",
    "Connected to FCC /direct. Lock policy, then sign."
  );
} else {
  modeBadge.dataset.mode = "preview";
  modeBadge.textContent = "Preview";
  setStatus(
    "idle",
    "Policy preview",
    "Same allowlist + cap + expiry rules as the enclave. Live TEE proof is in the demo video and npm run live:smoke."
  );
}
