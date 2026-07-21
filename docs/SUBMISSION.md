# <img src="logo.svg" alt="" width="28" height="27" /> DoraHacks submission — CipherSign

## Project name

CipherSign

## Selected bounty

**Bounty 2 — Confidential Compute Apps**

## Short product description

CipherSign is a confidential signing vault on Flare Confidential Compute. A private key is held inside a TEE. Signature requests are gated by a policy (allowed recipient, max amount, expiry) enforced inside the enclave — not in a mutable backend.

Built for agent wallets, payroll bots, and OTC/escrow flows that must prove: *this key only signs under rules X*.

## Target user

- Protocol / agent operators who need automated signing without hot-wallet risk  
- Teams building payroll, OTC, or escrow that must prove policy-bound signing  

## Demo

- **App:** https://cipher-sign.vercel.app  
- **Video:** _(2-min Loom/YouTube — follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md))_  
- **Repo:** https://github.com/thesithunyein/cipher-sign  
- **Network:** Flare Testnet Coston2 (chain id 114)  

**Note for judges:** Live FCC on Coston2 is being refreshed by Flare. The shipped demo uses **mock mode with the same policy rules as the TEE extension**, plus a real Coston2 `InstructionSender`. Live `/direct` plugs in when `develop` tee-proxy/tee-node is stable.

## How it uses Flare

1. `InstructionSender` calls Flare `TeeExtensionRegistry.sendInstructions`  
2. Registered TEE machine runs the CipherSign extension  
3. Ops: `KEY/UPDATE`, `KEY/SET_POLICY`, `KEY/SIGN` (policy-gated)  
4. Direct API (`POST /direct`) for reliable hackathon demos (Flare guidance)  

Details: [ARCHITECTURE.md](ARCHITECTURE.md)

## What was newly built

- Policy model + gated SIGN on top of Flare’s sign scaffold (`SET_POLICY`, intent ABI checks)  
- Product demo UI (demo + live `/direct` wiring)  
- 28 unit tests covering pass/reject paths  
- Coston2 deployment of `InstructionSender`  
- Judge docs: architecture, Loom script, feedback loop  

## Deployment details

| Item | Value |
|---|---|
| Network | Flare Testnet Coston2 (114) |
| InstructionSender | `0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9` |
| EXTENSION_ID | `0x0000000000000000000000000000000000000000000000000000000000000665` |
| Deployer | `0xc73Be03499616FFaA79315673e620AACfbb920C4` |
| Explorer | https://coston2-explorer.flare.network/address/0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9 |

## Roadmap

1. Harden policy (multi-recipient allowlist, spending windows)  
2. Agent SDK: request signatures from bots without exposing keys  
3. Protocol Managed Wallets / XRPL outbound once FCC matures on Songbird/mainnet  

## Traction

- Tester ask + log: [FEEDBACK.md](FEEDBACK.md)  
- Telegram feedback: _(paste)_  
- Pilot users: _(paste)_  
