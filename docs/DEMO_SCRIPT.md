# Loom / YouTube (≤2 min) — record for judges

## Goal

In two minutes a judge understands: problem → CipherSign → Flare FCC → demo proof → roadmap.

## Script

**0:00–0:15 · Hook**  
“CipherSign keeps signing keys inside a Flare TEE. Policy decides what can be signed — recipient, cap, expiry.”

**0:15–0:40 · Problem**  
“Hot wallets and bots can sign anything. A normal backend can change rules silently. For agent payroll or OTC, that’s unacceptable.”

**0:40–1:20 · Demo (screen)**  
1. Open live demo → pick scenario (Agent payroll)  
2. Lock policy  
3. Request signature → pass  
4. Over-cap attack → rejected  
5. Flash Coston2 explorer: InstructionSender `0x79bB…0Ee9`

**1:20–1:45 · Flare integration**  
“InstructionSender → TeeExtensionRegistry → CipherSign extension. Ops: UPDATE, SET_POLICY, SIGN. Same policy rules in the TypeScript TEE handlers — 28 tests green.”

**1:45–2:00 · Close**  
“Next: agent SDK and PMW/XRPL when FCC matures. Built for Summer Signal Bounty 2 — Confidential Compute Apps.”

## Upload

Unlisted YouTube or Loom → paste URL into DoraHacks + `docs/SUBMISSION.md`.
