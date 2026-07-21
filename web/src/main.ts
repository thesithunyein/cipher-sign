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

let policy: Policy | null = null;
let keyLoaded = true;

const logEl = document.querySelector<HTMLPreElement>("#log")!;
const modeEl = document.querySelector<HTMLElement>("#mode")!;
const live = liveConfig();

modeEl.textContent = live
  ? `LIVE · ${live.baseUrl}`
  : "DEMO · local policy sim (set VITE_DIRECT_URL to go live)";

function writeLog(message: string, kind: "ok" | "bad" | "neutral" = "neutral") {
  const stamp = new Date().toISOString().slice(11, 19);
  logEl.textContent = `[${stamp}] ${message}`;
  logEl.classList.remove("ok", "bad");
  if (kind === "ok") logEl.classList.add("ok");
  if (kind === "bad") logEl.classList.add("bad");
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
      writeLog(
        `LIVE policy locked in TEE.\nrecipient=${next.allowedRecipient}\nmax=${next.maxAmount}\nexpires=${next.expiresAt}`,
        "ok"
      );
      return;
    }

    policy = next;
    writeLog(
      `Policy locked (demo).\nrecipient=${policy.allowedRecipient}\nmax=${policy.maxAmount}\nexpires=${policy.expiresAt}`,
      "ok"
    );
  } catch (e) {
    writeLog(`Policy error: ${e}`, "bad");
  }
});

document.querySelector("#trySign")!.addEventListener("click", async () => {
  if (!policy && !live) {
    writeLog("Set a policy first.", "bad");
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
        writeLog(`TEE rejected SIGN.\n${res.log ?? "unknown"}`, "bad");
        return;
      }
      writeLog(
        `LIVE TEE approved SIGN.\ndata=${res.data ?? "(none)"}\n\nFlare FCC path: /direct → CipherSign extension in TEE.`,
        "ok"
      );
      return;
    }

    if (!policy) {
      writeLog("Set a policy first.", "bad");
      return;
    }
    const err = checkPolicy(policy, intent);
    if (err) {
      writeLog(`TEE rejected SIGN.\n${err}`, "bad");
      return;
    }
    const intentHex = encodeIntent(intent);
    const sig = fakeSignature(intentHex);
    writeLog(
      `Demo TEE approved SIGN.\nintent=${intentHex}\nsignature(demo)=${sig}\n\nEnable live: copy web/.env.example → .env.local after full-setup.`,
      "ok"
    );
  } catch (e) {
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
    ? "Live mode armed. Set policy, then request signature against Coston2 TEE."
    : "DEMO / MOCK mode (Flare guidance while FCC Coston2 is updating).\n1) Lock policy\n2) Request signature (should pass)\n3) Try over-cap attack (should reject)\n\nTell us what felt confusing — that feedback wins hackathons."
);
