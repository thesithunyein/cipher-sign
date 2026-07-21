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
    hint: "Payroll bot may only pay one recipient up to a hard cap.",
    recipient: "0x1111111111111111111111111111111111111111",
    maxAmount: "1000000",
    intentAmount: "500000",
  },
  otc: {
    hint: "OTC desk settles to a fixed counterparty — never a random address.",
    recipient: "0x2222222222222222222222222222222222222222",
    maxAmount: "5000000",
    intentAmount: "2500000",
  },
  treasury: {
    hint: "Treasury bot can top up ops wallets — capped so a bug cannot drain.",
    recipient: "0x3333333333333333333333333333333333333333",
    maxAmount: "250000",
    intentAmount: "100000",
  },
};

let policy: Policy | null = null;
let keyLoaded = true;

const logEl = document.querySelector<HTMLPreElement>("#log")!;
const modeEl = document.querySelector<HTMLElement>("#mode")!;
const policyState = document.querySelector<HTMLElement>("#policyState")!;
const signState = document.querySelector<HTMLElement>("#signState")!;
const scenarioHint = document.querySelector<HTMLElement>("#scenarioHint")!;
const live = liveConfig();

modeEl.textContent = live
  ? `LIVE · ${live.baseUrl}`
  : "DEMO · same policy rules as TEE extension";

const banner = document.querySelector<HTMLElement>("#statusBanner")!;
if (live) {
  banner.textContent =
    "Live mode: requests go to Flare TEE proxy /direct → CipherSign extension.";
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
  writeLog(`Scenario: ${id}. Lock policy, then request a signature.`);
}

document.querySelectorAll<HTMLButtonElement>(".scenario").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".scenario")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    applyScenario(btn.dataset.scenario || "payroll");
  });
});

document.querySelector("#setPolicy")!.addEventListener("click", async () => {
  try {
    const next = readPolicyFromForm();
    if (!/^0x[a-fA-F0-9]{40}$/.test(next.allowedRecipient)) {
      writeLog("Invalid recipient address.", "bad");
      return;
    }

    if (live) {
      writeLog("Sending SET_POLICY to Flare TEE /direct…");
      const res = await sendDirectInstruction({
        baseUrl: live.baseUrl,
        apiKey: live.apiKey,
        opType: "KEY",
        opCommand: "SET_POLICY",
        originalMessage: encodePolicy(next),
      });
      if (res.status !== 1) {
        writeLog(`TEE rejected SET_POLICY.\n${res.log ?? "unknown"}`, "bad");
        return;
      }
      policy = next;
      policyState.textContent = "locked";
      policyState.classList.add("locked");
      writeLog(
        `LIVE policy locked in TEE.\nrecipient=${next.allowedRecipient}\nmax=${next.maxAmount}\nexpires=${next.expiresAt}`,
        "ok"
      );
      return;
    }

    policy = next;
    policyState.textContent = "locked";
    policyState.classList.add("locked");
    writeLog(
      `Policy locked (demo = TEE rules).\nrecipient=${policy.allowedRecipient}\nmax=${policy.maxAmount}\nexpires=${policy.expiresAt}`,
      "ok"
    );
  } catch (e) {
    writeLog(`Policy error: ${e}`, "bad");
  }
});

document.querySelector("#trySign")!.addEventListener("click", async () => {
  if (!policy && !live) {
    writeLog("Set a policy first.", "bad");
    setSignState("need policy", "fail");
    return;
  }
  try {
    const intent = readIntentFromForm();

    if (live) {
      writeLog("Sending SIGN intent to Flare TEE /direct…");
      const res = await sendDirectInstruction({
        baseUrl: live.baseUrl,
        apiKey: live.apiKey,
        opType: "KEY",
        opCommand: "SIGN",
        originalMessage: encodeIntent(intent),
      });
      if (res.status !== 1) {
        setSignState("rejected", "fail");
        writeLog(`TEE rejected SIGN.\n${res.log ?? "unknown"}`, "bad");
        return;
      }
      setSignState("approved", "pass");
      writeLog(
        `LIVE TEE approved SIGN.\ndata=${res.data ?? "(none)"}\n\nPath: /direct → CipherSign extension in TEE.`,
        "ok"
      );
      return;
    }

    if (!policy) {
      writeLog("Set a policy first.", "bad");
      setSignState("need policy", "fail");
      return;
    }
    const err = checkPolicy(policy, intent);
    if (err) {
      setSignState("rejected", "fail");
      writeLog(`TEE rejected SIGN.\n${err}`, "bad");
      return;
    }
    const intentHex = encodeIntent(intent);
    const sig = fakeSignature(intentHex);
    setSignState("approved", "pass");
    writeLog(
      `Demo TEE approved SIGN.\nintent=${intentHex}\nsignature(demo)=${sig}\n\nOver-cap attack should fail — try it next.`,
      "ok"
    );
  } catch (e) {
    setSignState("error", "fail");
    writeLog(`Sign error: ${e}`, "bad");
  }
});

document.querySelector("#tryBad")!.addEventListener("click", () => {
  const max =
    policy?.maxAmount ??
    BigInt(document.querySelector<HTMLInputElement>("#maxAmount")!.value || "0");
  document.querySelector<HTMLInputElement>("#intentAmount")!.value = (
    max + 1n
  ).toString();
  document.querySelector<HTMLButtonElement>("#trySign")!.click();
});

writeLog(
  live
    ? "Live mode armed. Lock policy, then request signature against Coston2 TEE."
    : "DEMO mode (identical policy checks as CipherSign extension).\n1) Lock policy\n2) Request signature (pass)\n3) Over-cap attack (reject)\n\nThis is the product judges should feel in 2 minutes."
);
