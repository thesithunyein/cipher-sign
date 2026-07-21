# CipherSign

**Flare Summer Signal — Bounty 2: Confidential Compute Apps**

Policy-gated confidential signing on Flare Confidential Compute (FCC).  
A private key lives inside a TEE. Signatures only release when policy passes **inside the enclave** — recipient allowlist, spend cap, expiry.

```
Hot wallet / bot key  →  signs anything
CipherSign vault      →  signs only what policy allows (attested TEE)
```

Live demo · _(deploy `web/` → paste URL)_ · [Submission](docs/SUBMISSION.md) · [Architecture](docs/ARCHITECTURE.md) · [Win checklist](docs/WIN_CHECKLIST.md)

## Why this wins Bounty 2

| Judge lens | CipherSign |
|---|---|
| **Useful product** | Real problem: agent / bot / payroll keys that must not be hot wallets |
| **Flare-native** | `InstructionSender` → `TeeExtensionRegistry` → CipherSign extension in TEE |
| **Technical depth** | New `SET_POLICY` op + ABI intent checks + ECDSA only after gate |
| **Evidence** | 28/28 unit tests · Coston2 contract deployed · judge demo UI |
| **Future** | Agent SDK · multi-recipient · PMW / XRPL outbound when FCC matures |

This is not a “privacy DB” wrapper. Removing Flare removes the **attested TEE + registry** trust model.

## Proof on Coston2

| Item | Value |
|------|-------|
| Network | Flare Testnet Coston2 (`114`) |
| InstructionSender | [`0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9`](https://coston2-explorer.flare.network/address/0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9) |
| EXTENSION_ID | `0x0000000000000000000000000000000000000000000000000000000000000665` |
| Deployer | `0xc73Be03499616FFaA79315673e620AACfbb920C4` |
| Tests | `cd tee/typescript && npm test` → **28/28 pass** |

## What we built (new work)

On top of Flare’s `fce-direct-sign` scaffold:

1. **`KEY/SET_POLICY`** — ABI `(address, uint256 maxAmount, uint256 expiresAt)`
2. **Gated `KEY/SIGN`** — rejects wrong recipient, over-cap, expired policy/intent
3. **Product demo UI** — mock policy sim now; live `POST /direct` when FCC is up
4. **Judge pack** — architecture, Loom script, DoraHacks submission draft, feedback loop

## Try the demo (2 minutes)

```bash
cd web && npm install && npm run dev
```

1. Lock policy (recipient + max amount)  
2. Request signature → pass  
3. **Try over-cap attack** → reject  

Feedback template: [docs/FEEDBACK.md](docs/FEEDBACK.md)

## How Flare FCC is used

```
Client / bot
    ↓  SET_POLICY / SIGN
InstructionSender.sol  (Coston2)
    ↓
TeeExtensionRegistry
    ↓
CipherSign extension (TypeScript, inside TEE)
    ↓  policy OK?
ECDSA signature returned
```

Hackathon-reliable path: TEE proxy `POST /direct` (Flare guidance).  
Full local stack: [docs/SETUP.md](docs/SETUP.md) — use **`develop`** for `tee-proxy` / `tee-node`.

## Repo layout

```
cipher-sign/
  tee/typescript/   # CipherSign handlers (product logic)
  tee/contract/     # InstructionSender.sol
  tee/scripts/      # FCC full-setup helpers
  web/              # Judge / tester demo
  docs/             # Architecture, setup, submission
```

## Status (honest)

Flare is refreshing FCC on Coston2. Product policy logic + UI + contract are ready; live TEE attach follows when `develop` stack is stable. Demo mode uses the **same policy rules** as the extension so testers and judges can evaluate the product now.

## License

MIT — see [LICENSE](LICENSE). Upstream FCC scaffold portions © Flare Foundation.
