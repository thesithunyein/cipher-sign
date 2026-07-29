# <img src="logo.svg" alt="" width="28" height="27" /> DoraHacks submission — CipherSign

## Project name

CipherSign

## Selected bounty

**Bounty 2 — Confidential Compute Apps**

## Short product description

CipherSign is a confidential signing vault on Flare Confidential Compute. A private key is held inside a TEE. Signature requests are gated by a policy (recipient allowlist, max amount, expiry) enforced inside the enclave — not in a mutable backend.

Built for Flare-today operators: FAssets executor fee vaults, keeper/bot payouts, and FTSO reward forwarders that must prove: *this key only signs under rules X*.

## Target user

- FAssets / FXRP ops scripts that pay fees to fixed recipients under a hard cap  
- Flare DeFi keepers and bots that must sign payouts without a drainable hot key  
- FTSO providers forwarding rewards to a locked payout address  

## Demo

- **App:** https://cipher-sign.vercel.app  
- **Video:** https://youtu.be/ZQVAkcT0Z08 _(re-record after polish if needed; follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md))_  
- **Repo:** https://github.com/thesithunyein/cipher-sign  
- **Network:** Flare Testnet Coston2 (chain id 114)  
- **BUIDL:** https://dorahacks.io/buidl/47182/  

**Note for judges:** Public Vercel defaults to **Policy preview** (same allowlist/cap/expiry rules in-browser). Live policy-gated `KEY/UPDATE` → `SET_POLICY` → `SIGN` is proven via FCC `/direct` on Coston2 (`SIMULATED_TEE=true`, `CHAIN_ID=114`; see `npm run live:smoke` and the demo video). Set `VITE_DIRECT_URL` + `VITE_DIRECT_API_KEY` (public tunnel to :6674) for hosted Live TEE.

## How it uses Flare

1. `InstructionSender` calls Flare `TeeExtensionRegistry.sendInstructions`  
2. Registered TEE machine runs the CipherSign extension  
3. Ops: `KEY/UPDATE`, `KEY/SET_POLICY`, `KEY/SIGN` (policy-gated)  
4. Direct API (`POST /direct`) for reliable hackathon demos (Flare guidance)  

Details: [ARCHITECTURE.md](ARCHITECTURE.md)

## What was newly built

- Policy model + gated SIGN on top of Flare’s sign scaffold (`SET_POLICY` allowlist, intent ABI checks)  
- Flare-native product UI (FAssets / Bot / FTSO + Preview / Live TEE modes)  
- Unit tests covering pass/reject + allowlist paths (29/29)  
- Coston2 deployment of `InstructionSender`  
- Judge docs: architecture, demo script, feedback loop  

## Deployment details

| Item | Value |
|---|---|
| Network | Flare Testnet Coston2 (114) |
| InstructionSender | `0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9` |
| EXTENSION_ID | `0x0000000000000000000000000000000000000000000000000000000000000665` |
| Deployer | `0xc73Be03499616FFaA79315673e620AACfbb920C4` |
| Explorer | https://coston2-explorer.flare.network/address/0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9 |

## Roadmap

1. Spending windows / rate limits on top of allowlist  
2. Agent SDK: request signatures from bots without exposing keys  
3. Protocol Managed Wallets / XRPL outbound once FCC matures on Songbird/mainnet  

## Traction

- Tester ask + log: [FEEDBACK.md](FEEDBACK.md)  
- Telegram / X: ask posted in Flare Hackathon Club; collect named replies before judging  
- Pilot users: _(add as they reply)_  
