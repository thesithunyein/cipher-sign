# DoraHacks paste (update BUIDL now)

Use these on https://dorahacks.io/buidl/47182/ so the form matches the live product.

## Vision (short)

Policy-gated confidential signing for Flare. Keys stay in a TEE; signatures only release when allowlist, max amount, and expiry pass. Built for FAssets fee vaults, Flare bots, and FTSO reward forwarders.

## Details (plain text)

CipherSign is a confidential signing vault on Flare Confidential Compute.

A private key lives inside a TEE. Signature requests are gated by a policy (recipient allowlist, max amount, expiry) enforced inside the enclave, not in a mutable backend. If the intent breaks the rules, the key never signs.

Who uses this on Flare today
FAssets / FXRP ops scripts that pay fees to fixed recipients under a hard cap.
Flare DeFi keepers and bots that must sign payouts without a drainable hot key.
FTSO providers forwarding rewards to a locked payout address.

Flows
1. KEY/UPDATE create a signing key inside the TEE
2. KEY/SET_POLICY lock allowlist, max amount, expiry
3. KEY/SIGN release an ECDSA signature only if the intent passes policy; otherwise reject

How it uses Flare
InstructionSender → TeeExtensionRegistry.sendInstructions → CipherSign TEE extension on Coston2. Direct API (POST /direct) for reliable demos per Flare FCC guidance.

Evidence for judges
App: https://cipher-sign.vercel.app (Live TEE when operator tunnel is up; otherwise Policy preview with the same rules)
Repo: https://github.com/thesithunyein/cipher-sign
Network: Flare Testnet Coston2 (chain id 114)
InstructionSender: 0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9
EXTENSION_ID: 0x…0665
Tests: 29/29
Demo video: re-record ≤90s Live UPDATE → SET_POLICY → SIGN + over-cap / wrong-recipient reject (see docs/DEMO_SCRIPT.md)

## Links checklist

- Website: https://cipher-sign.vercel.app
- Demo video: _(upload new recording; old YouTube is down)_
- GitHub: https://github.com/thesithunyein/cipher-sign
- Social: your X post

## After paste

1. Re-record ≤90s with current UI (docs/DEMO_SCRIPT.md) and paste the new YouTube/Loom URL  
2. Re-post tester ask in Flare Hackathon Club  
3. Log every reply in docs/FEEDBACK.md  
4. Ask testers to Bookmark ↑ the BUIDL  
