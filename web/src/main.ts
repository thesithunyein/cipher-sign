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
type Intent = SignIntent;

const SCENARIOS: Record<
  string,
  {
    hint: string;
    recipient: `0x${string}`;
    maxAmount: string;
    intentAmount: string;
  }
> = {
  payroll: {
    hint: "Your payroll agent can only pay one employee, up to the cap you set.",
    recipient: "0x1111111111111111111111111111111111111111",
    maxAmount: "1000000",
    intentAmount: "500000",
  },
  otc: {
    hint: "OTC settlement stays locked to one counterparty — never a random address.",
    recipient: "0x2222222222222222222222222222222222222222",
    maxAmount: "5000000",
    intentAmount: "2500000",
  },
  treasury: {
    hint: "Treasury bots can top up ops wallets without risking a full drain.",
    recipient: "0x3333333333333333333333333333333333333333",
    maxAmount: "250000",
    intentAmount: "100000",
  },
};

const FRIENDLY_ERRORS: Record<string, string> = {
  "no private key stored": "No key is loaded in the vault yet.",
  "policy expired": "This policy has expired.",
  "intent deadline passed": "This request’s deadline has passed.",
  "recipient not allowed by policy": "That payee isn’t allowed by the locked policy.",
  "amount exceeds policy maxAmount": "Amount is above the policy max — vault blocked it.",
};

let policy: Policy | null = null;
let keyLoaded = true;
let toastTimer = 0;
let demoRunning = false;

const logEl = document.querySelector<HTMLPreElement>("#log")!;
const modeEl = document.querySelector<HTMLElement>("#mode")!;
const policyState = document.querySelector<HTMLElement>("#policyState")!;
const signState = document.querySelector<HTMLElement>("#signState")!;
const scenarioHint = document.querySelector<HTMLElement>("#scenarioHint")!;
const signHint = document.querySelector<HTMLElement>("#signHint")!;
const readyPill = document.querySelector<HTMLElement>("#readyPill")!;
const resultBadge = document.querySelector<HTMLElement>("#resultBadge")!;
const resultTitle = document.querySelector<HTMLElement>("#resultTitle")!;
const resultBody = document.querySelector<HTMLElement>("#resultBody")!;
const resultPanel = document.querySelector<HTMLElement>("#resultPanel")!;
const setPolicyBtn = document.querySelector<HTMLButtonElement>("#setPolicy")!;
const trySignBtn = document.querySelector<HTMLButtonElement>("#trySign")!;
const tryBadBtn = document.querySelector<HTMLButtonElement>("#tryBad")!;
const toastEl = document.querySelector<HTMLElement>("#toast")!;
const rail1 = document.querySelector<HTMLElement>("#rail-1")!;
const rail2 = document.querySelector<HTMLElement>("#rail-2")!;
const rail3 = document.querySelector<HTMLElement>("#rail-3")!;
const maxAmountNote = document.querySelector<HTMLElement>("#maxAmountNote")!;
const intentAmountNote = document.querySelector<HTMLElement>("#intentAmountNote")!;
const live = liveConfig();

modeEl.textContent = live ? "Live vault connected" : "Interactive demo";

const banner = document.querySelector<HTMLElement>("#statusBanner")!;
if (live) {
  banner.textContent =
    "Live mode: requests go to the Flare TEE proxy and CipherSign extension.";
}

function formatUnits(raw: string): string {
  try {
    const n = BigInt(raw || "0");
    return `${n.toLocaleString("en-US")} units`;
  } catch {
    return "Enter a number";
  }
}

function friendlyError(err: string): string {
  return FRIENDLY_ERRORS[err] ?? err;
}

function showToast(message: string, kind: "ok" | "bad" | "neutral" = "neutral") {
  toastEl.hidden = false;
  toastEl.textContent = message;
  toastEl.classList.remove("ok", "bad", "show");
  if (kind === "ok") toastEl.classList.add("ok");
  if (kind === "bad") toastEl.classList.add("bad");
  requestAnimationFrame(() => toastEl.classList.add("show"));
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2800);
}

function setRail(step: 1 | 2 | 3) {
  [rail1, rail2, rail3].forEach((el, i) => {
    const n = (i + 1) as 1 | 2 | 3;
    el.dataset.active = n === step ? "true" : "false";
    el.dataset.done = n < step ? "true" : "false";
  });
}

function setResult(
  kind: "idle" | "ok" | "bad",
  title: string,
  body: string,
  badge: string
) {
  resultPanel.dataset.kind = kind;
  resultTitle.textContent = title;
  resultBody.textContent = body;
  resultBadge.textContent = badge;
  resultBadge.dataset.kind = kind;
}

function setBusy(btn: HTMLButtonElement, busy: boolean, label?: string) {
  btn.classList.toggle("busy", busy);
  if (label) btn.dataset.label ??= btn.textContent || "";
  if (busy && label) btn.textContent = label;
  if (!busy && btn.dataset.label) btn.textContent = btn.dataset.label;

  if (busy) {
    btn.disabled = true;
    return;
  }
  if (btn === trySignBtn || btn === tryBadBtn) {
    btn.disabled = !policy && !live;
    return;
  }
  btn.disabled = false;
}

function syncSignControls() {
  const ready = Boolean(policy) || Boolean(live);
  trySignBtn.disabled = !ready || demoRunning;
  tryBadBtn.disabled = !ready || demoRunning;
  setPolicyBtn.disabled = demoRunning;
  signHint.textContent = ready
    ? "Approve a valid payment, or simulate an overspend to see a rejection."
    : "Lock a policy first — signing stays disabled until then.";
  readyPill.textContent = ready ? "Policy locked" : "Policy unlocked";
  readyPill.dataset.ready = ready ? "true" : "false";
  if (ready) setRail(2);
  else setRail(1);
}

function writeLog(message: string, kind: "ok" | "bad" | "neutral" = "neutral") {
  const stamp = new Date().toISOString().slice(11, 19);
  logEl.textContent = `[${stamp}] ${message}`;
  logEl.classList.remove("ok", "bad");
  if (kind === "ok") logEl.classList.add("ok");
  if (kind === "bad") logEl.classList.add("bad");
}

function setSignState(text: string, kind: "waiting" | "pass" | "fail") {
  signState.textContent = text;
  signState.classList.remove("pass", "fail", "locked");
  if (kind === "pass") signState.classList.add("pass");
  if (kind === "fail") signState.classList.add("fail");
}

function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function readPolicyFromForm(): Policy {
  return {
    allowedRecipient: (
      document.querySelector<HTMLInputElement>("#recipient")!.value || ""
    ).trim() as `0x${string}`,
    maxAmount: BigInt(
      document.querySelector<HTMLInputElement>("#maxAmount")!.value || "0"
    ),
    expiresAt: BigInt(
      document.querySelector<HTMLInputElement>("#expiresAt")!.value || "0"
    ),
  };
}

function readIntentFromForm(): Intent {
  const recipient = (
    document.querySelector<HTMLInputElement>("#intentRecipient")!.value || ""
  ).trim() as `0x${string}`;
  const amount = BigInt(
    document.querySelector<HTMLInputElement>("#intentAmount")!.value || "0"
  );
  const deadline = BigInt(
    document.querySelector<HTMLInputElement>("#intentDeadline")!.value || "0"
  );
  const payloadHash = keccak256(toBytes(`ciphersign:${recipient}:${amount}`));
  return { recipient, amount, deadline, payloadHash };
}

function checkPolicy(p: Policy, intent: Intent): string | null {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (!keyLoaded) return "no private key stored";
  if (p.expiresAt !== 0n && now > p.expiresAt) return "policy expired";
  if (intent.deadline !== 0n && now > intent.deadline)
    return "intent deadline passed";
  if (intent.recipient.toLowerCase() !== p.allowedRecipient.toLowerCase()) {
    return "recipient not allowed by policy";
  }
  if (intent.amount > p.maxAmount) return "amount exceeds policy maxAmount";
  return null;
}

function fakeSignature(intentHex: Hex): string {
  return keccak256(toBytes(`sig:${intentHex}`));
}

function refreshAmountNotes() {
  maxAmountNote.textContent = formatUnits(
    document.querySelector<HTMLInputElement>("#maxAmount")!.value
  );
  intentAmountNote.textContent = formatUnits(
    document.querySelector<HTMLInputElement>("#intentAmount")!.value
  );
}

function applyScenario(id: string) {
  const s = SCENARIOS[id];
  if (!s) return;
  scenarioHint.textContent = s.hint;
  document.querySelector<HTMLInputElement>("#recipient")!.value = s.recipient;
  document.querySelector<HTMLInputElement>("#intentRecipient")!.value =
    s.recipient;
  document.querySelector<HTMLInputElement>("#maxAmount")!.value = s.maxAmount;
  document.querySelector<HTMLInputElement>("#intentAmount")!.value =
    s.intentAmount;
  policy = null;
  policyState.textContent = "unlocked";
  policyState.classList.remove("locked");
  setSignState("waiting", "waiting");
  refreshAmountNotes();
  syncSignControls();
  setRail(1);
  setResult(
    "idle",
    "Scenario loaded",
    s.hint + " Lock the policy, then approve a payment.",
    "Ready"
  );
  writeLog(`Loaded ${id} scenario.`);
}

async function lockPolicy(): Promise<boolean> {
  const recipientInput = document.querySelector<HTMLInputElement>("#recipient")!;
  try {
    const next = readPolicyFromForm();
    recipientInput.classList.toggle("invalid", !isAddress(next.allowedRecipient));
    if (!isAddress(next.allowedRecipient)) {
      writeLog("Invalid recipient address.", "bad");
      showToast("Enter a valid 0x address", "bad");
      setResult("bad", "Can’t lock policy", "The payee address looks invalid.", "Error");
      return false;
    }

    setBusy(setPolicyBtn, true, "Locking…");
    if (live) {
      writeLog("Sending SET_POLICY to Flare TEE…");
      const res = await sendDirectInstruction({
        baseUrl: live.baseUrl,
        apiKey: live.apiKey,
        opType: "KEY",
        opCommand: "SET_POLICY",
        originalMessage: encodePolicy(next),
      });
      if (res.status !== 1) {
        writeLog(`TEE rejected SET_POLICY.\n${res.log ?? "unknown"}`, "bad");
        showToast("Policy rejected by TEE", "bad");
        setResult("bad", "Policy rejected", res.log ?? "TEE returned an error.", "Rejected");
        return false;
      }
    }

    policy = next;
    policyState.textContent = "locked";
    policyState.classList.add("locked");
    syncSignControls();
    setRail(2);
    showToast("Policy locked in vault", "ok");
    setResult(
      "ok",
      "Policy is active",
      `Payee ${shortAddr(next.allowedRecipient)} · max ${next.maxAmount.toLocaleString("en-US")} · expiry ${next.expiresAt === 0n ? "never" : next.expiresAt.toString()}`,
      "Locked"
    );
    writeLog(
      `Policy locked.\nrecipient=${next.allowedRecipient}\nmax=${next.maxAmount}\nexpires=${next.expiresAt}`,
      "ok"
    );
    return true;
  } catch (e) {
    writeLog(`Policy error: ${e}`, "bad");
    showToast("Couldn’t lock policy", "bad");
    setResult("bad", "Something went wrong", String(e), "Error");
    return false;
  } finally {
    setBusy(setPolicyBtn, false);
    syncSignControls();
  }
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function requestSign(): Promise<boolean> {
  if (!policy && !live) {
    writeLog("Set a policy first.", "bad");
    setSignState("need policy", "fail");
    showToast("Lock a policy first", "bad");
    return false;
  }

  const recipientInput =
    document.querySelector<HTMLInputElement>("#intentRecipient")!;
  try {
    const intent = readIntentFromForm();
    recipientInput.classList.toggle("invalid", !isAddress(intent.recipient));
    if (!isAddress(intent.recipient)) {
      writeLog("Invalid intent recipient.", "bad");
      setSignState("invalid", "fail");
      showToast("Enter a valid payee address", "bad");
      return false;
    }

    setBusy(trySignBtn, true, "Checking…");
    if (live) {
      writeLog("Sending SIGN intent to Flare TEE…");
      const res = await sendDirectInstruction({
        baseUrl: live.baseUrl,
        apiKey: live.apiKey,
        opType: "KEY",
        opCommand: "SIGN",
        originalMessage: encodeIntent(intent),
      });
      if (res.status !== 1) {
        setSignState("rejected", "fail");
        setRail(3);
        writeLog(`TEE rejected SIGN.\n${res.log ?? "unknown"}`, "bad");
        showToast("Request blocked", "bad");
        setResult("bad", "Vault blocked this request", res.log ?? "Rejected by TEE.", "Blocked");
        return false;
      }
      setSignState("approved", "pass");
      setRail(3);
      showToast("Signature approved", "ok");
      setResult(
        "ok",
        "Signature released",
        "The TEE approved this intent under the locked policy.",
        "Approved"
      );
      writeLog(`LIVE TEE approved SIGN.\ndata=${res.data ?? "(none)"}`, "ok");
      return true;
    }

    if (!policy) return false;
    const err = checkPolicy(policy, intent);
    if (err) {
      const nice = friendlyError(err);
      setSignState("rejected", "fail");
      setRail(3);
      writeLog(`TEE rejected SIGN.\n${err}`, "bad");
      showToast("Request blocked", "bad");
      setResult("bad", "Vault blocked this request", nice, "Blocked");
      return false;
    }

    const intentHex = encodeIntent(intent);
    const sig = fakeSignature(intentHex);
    setSignState("approved", "pass");
    setRail(3);
    showToast("Signature approved", "ok");
    setResult(
      "ok",
      "Signature released",
      `Paid ${intent.amount.toLocaleString("en-US")} to ${shortAddr(intent.recipient)}. Demo signature: ${sig.slice(0, 18)}…`,
      "Approved"
    );
    writeLog(`Approved SIGN.\nintent=${intentHex}\nsig=${sig}`, "ok");
    return true;
  } catch (e) {
    setSignState("error", "fail");
    writeLog(`Sign error: ${e}`, "bad");
    showToast("Sign failed", "bad");
    setResult("bad", "Something went wrong", String(e), "Error");
    return false;
  } finally {
    setBusy(trySignBtn, false);
    syncSignControls();
  }
}

function simulateOverspend() {
  const max =
    policy?.maxAmount ??
    BigInt(document.querySelector<HTMLInputElement>("#maxAmount")!.value || "0");
  document.querySelector<HTMLInputElement>("#intentAmount")!.value = (
    max + 1n
  ).toString();
  refreshAmountNotes();
  void requestSign();
}

document.querySelectorAll<HTMLButtonElement>(".scenario").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".scenario").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    applyScenario(btn.dataset.scenario || "payroll");
  });
});

setPolicyBtn.addEventListener("click", () => {
  void lockPolicy();
});
trySignBtn.addEventListener("click", () => {
  void requestSign();
});
tryBadBtn.addEventListener("click", simulateOverspend);

document.querySelector("#maxAmount")!.addEventListener("input", refreshAmountNotes);
document.querySelector("#intentAmount")!.addEventListener("input", refreshAmountNotes);

document.querySelector("#watchDemo")!.addEventListener("click", async () => {
  if (demoRunning) return;
  demoRunning = true;
  syncSignControls();
  document.querySelector<HTMLElement>("#workspace")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  applyScenario("payroll");
  showToast("Running quick demo…", "neutral");
  await new Promise((r) => setTimeout(r, 450));
  const locked = await lockPolicy();
  if (!locked) {
    demoRunning = false;
    syncSignControls();
    return;
  }
  await new Promise((r) => setTimeout(r, 650));
  await requestSign();
  await new Promise((r) => setTimeout(r, 900));
  simulateOverspend();
  demoRunning = false;
  syncSignControls();
  showToast("Demo complete — try your own values", "ok");
});

refreshAmountNotes();
syncSignControls();
setRail(1);
setResult(
  "idle",
  "Ready when you are",
  "Lock a policy, then approve a valid payment — or simulate an overspend to see the vault reject it.",
  "Waiting"
);
writeLog(
  live
    ? "Live vault ready."
    : "Interactive demo ready — same policy rules as the CipherSign TEE extension."
);
