# DoraHacks submission draft — CipherSign

## Project name

CipherSign

## Selected bounty

Bounty 2 — Confidential Compute Apps

## Short product description

CipherSign is a confidential signing vault on Flare Confidential Compute. A private key is held inside a TEE. Signature requests are gated by a policy (allowed recipient, max amount, expiry) enforced inside the enclave — not in a mutable backend.

## Target user

- Protocol / agent operators who need automated signing without hot-wallet risk
- Teams building payroll, OTC, or escrow flows that must prove “this key only signs under rules X”

## Demo

- App: _(Vercel — paste after deploy)_
- Video: _(2-min Loom — record mock flow + Coston2 contract)_
- Network: Flare Testnet Coston2 (chain id 114)
- Note: Live FCC Coston2 is being updated by Flare; UI ships in **mock/demo mode** with real policy logic + deployed InstructionSender. Live TEE integration planned when `develop` stack is stable (Flare ETA: couple of days).

## How it uses Flare

1. `InstructionSender` contract calls Flare `TeeExtensionRegistry.sendInstructions`
2. TEE machine registered on Coston2 runs our CipherSign extension
3. Ops: `KEY/UPDATE`, `KEY/SET_POLICY`, `KEY/SIGN` (policy-gated)
4. Direct API (`POST /direct`) used for reliable hackathon demos per Flare guidance

See [ARCHITECTURE.md](ARCHITECTURE.md) for the trust model and op encoding.

## What was newly built during the program

- Policy model + gated SIGN handler on top of Flare’s sign scaffold (`SET_POLICY`, intent ABI checks)
- Product demo UI with demo + live `/direct` modes
- Judge docs: architecture, Loom script, win checklist, Telegram indexer request
- Coston2 wallet + env scaffolding for deployment / registration

## Deployment details

| Item | Value |
|---|---|
| Network | Flare Testnet Coston2 (114) |
| InstructionSender | `0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9` |
| EXTENSION_ID | `0x0000000000000000000000000000000000000000000000000000000000000665` |
| Deployer | `0xc73Be03499616FFaA79315673e620AACfbb920C4` |
| Explorer | https://coston2-explorer.flare.network/address/0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9 |
| TEE proxy / tunnel | _pending indexer DB + `start-services`_ |

## Roadmap

1. Harden policy (multi-recipient allowlist, spending windows)
2. Agent SDK: request signatures from bots without exposing keys
3. Explore Protocol Managed Wallets / XRPL outbound once FCC matures on Songbird/mainnet

## Traction (optional for judges)

- Telegram feedback:
- Pilot users:
