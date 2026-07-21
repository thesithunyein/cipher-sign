# Loom script (≤2 min) — record this for judges

1. (0:00–0:15) Hook  
   "CipherSign keeps signing keys inside a Flare TEE. Policy decides what can be signed."

2. (0:15–0:45) Problem  
   "Hot wallets and bots can sign anything. A normal backend can change rules silently."

3. (0:45–1:20) Demo  
   - Show UI: lock policy (recipient + max amount)  
   - Request valid signature → success  
   - Over-cap attack → TEE rejects  
   - If LIVE: show Coston2 explorer / EXTENSION_ID / InstructionSender

4. (1:20–1:45) Flare integration  
   "InstructionSender → TeeExtensionRegistry → CipherSign extension. Ops: UPDATE, SET_POLICY, SIGN."

5. (1:45–2:00) Next  
   "Agent SDK + PMW/XRPL outbound when FCC matures. Built for Summer Signal Bounty 2."

Upload to YouTube/Loom unlisted → paste into DoraHacks + docs/SUBMISSION.md
