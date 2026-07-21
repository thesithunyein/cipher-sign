# CipherSign

**Flare Summer Signal — Bounty 2: Confidential Compute Apps**

Policy-gated confidential signing vault on Flare Confidential Compute (FCC).  
A private key lives inside a TEE. Signatures only release when an on-chain-triggered policy passes (recipient allowlist, spend cap, expiry).

> Build useful. Ship real. Target: working Coston2 demo before Aug 14, 2026.

## Status (Jul 21, 2026)

Flare is updating FCC on Coston2 (guides being reworked). Their guidance:

- Mock missing components and prepare integration (couple of days)
- Get people testing the product and gather feedback

**CipherSign now:** demo/mock UI + policy logic + unit tests + Coston2 `InstructionSender` deployed. Live TEE stack waits on stable `develop` tee-proxy/tee-node (signature issue under discussion with Flare).

| Item | Value |
|------|-------|
| Network | Coston2 (114) |
| InstructionSender | [`0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9`](https://coston2-explorer.flare.network/address/0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9) |
| EXTENSION_ID | `0x…0665` |
| Repo | https://github.com/thesithunyein/cipher-sign |

## Why this can win

| Judge lens | How CipherSign scores |
|---|---|
| Product usefulness | Real problem: hot keys / bot wallets sign anything; CipherSign enforces policy in TEE |
| Flare integration | Uses FCC extensions + InstructionSender + Coston2 TEE registration (not a fake “privacy” DB) |
| Technical execution | Official `fce-direct-sign` scaffold + TypeScript handlers + demo UI |
| Evidence of new work | Policy ops, product UI, submission pack — beyond Hello World |
| Future potential | Agent wallets, payroll, OTC escrow, XRPL PMW-style flows |

## Repo layout

```
cipher-sign/
  tee/                 # FCC extension (from Flare fce-direct-sign, customized)
  web/                 # Demo UI (Vite) — mock now, live /direct when FCC is up
  docs/                # Setup, architecture, submission, feedback
```

## Try the demo UI

```bash
cd web
npm install
npm run dev
```

1. Lock policy  
2. Request signature (pass)  
3. Over-cap attack (reject)  

Feedback template: [docs/FEEDBACK.md](docs/FEEDBACK.md)

## Live TEE (when Coston2 FCC is stable)

See [docs/SETUP.md](docs/SETUP.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).  
Use Flare’s current advice: **`develop`** branches for `tee-proxy` and `tee-node`.

## License

MIT — extension scaffold portions © Flare Foundation (see `tee/`).
