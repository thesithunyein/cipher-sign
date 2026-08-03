<p align="center">
  <img src="docs/logo-mark.svg" alt="CipherSign" width="72" height="72" />
</p>

<h1 align="center">CipherSign</h1>

<p align="center">
  <strong>Policy-gated payouts. Key stays in a Flare TEE.</strong><br/>
  Allowlist, spending limit, and expiry are enforced before any signature.
</p>

<p align="center">
  <a href="https://cipher-sign.vercel.app"><strong>cipher-sign.vercel.app</strong></a>
  ·
  <a href="https://coston2-explorer.flare.network/address/0x23E9d227a2b1741b8e23915D7F7f592f5FEDe36A">Coston2 contract</a>
</p>

---

## What it is

Hot wallets sign whatever you ask. That works for demos and drains treasuries in production.

CipherSign holds the signing key inside a **Flare Confidential Compute** TEE. Ops teams lock who can get paid and how much; every payout intent is checked **inside the enclave** before ECDSA runs.

| Rule | Blocks |
|------|--------|
| Allowlist | Wrong-person / poisoned address |
| Max amount | Overspend / script bugs |
| Expiry | Forever-valid automation keys |

Break a rule → **no signature**. The key never leaves the vault.

### Built for

| Mode | Job |
|------|-----|
| **Fee payouts** | Approved fee wallets only, under a hard cap |
| **Team payroll** | Pay approved people — never above the limit |
| **Rewards** | Partner rewards only to locked payout wallets |

---

## Use the live app

1. Open [cipher-sign.vercel.app](https://cipher-sign.vercel.app)
2. **Connect** the vault (operator TEE must be online)
3. Pick Fees / Payroll / Rewards → set allowlist + limit → **Lock rules on-chain**
4. **Approve** a payout under the rules — or try over-limit / wrong address and watch the TEE refuse

Gas for Lock / Approve is **operator-sponsored** on Coston2 (you pay $0). Explorer tx + recovered vault signer are shown in-app after a successful approval.

---

## How it works

```text
Browser  →  InstructionSender (Coston2)
         →  FlareTeeManager diamond
         →  CipherSign TEE extension
              UPDATE   load vault key (ECIES)
              SET_POLICY   lock allowlist · max · expiry
              SIGN         ECDSA only if intent passes
```

Policy and key live in enclave memory. Restarting the TEE clears the key; the live app reloads it via sponsored `updateKey` before Lock / Approve.

Deeper design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/PRODUCT.md](docs/PRODUCT.md)

---

## On-chain (Coston2)

| | |
|---|---|
| Network | Flare Testnet Coston2 (`114`) |
| InstructionSender | [`0x23E9d227a2b1741b8e23915D7F7f592f5FEDe36A`](https://coston2-explorer.flare.network/address/0x23E9d227a2b1741b8e23915D7F7f592f5FEDe36A) |
| Extension ID | `65907` (`0x…010173`) |
| FlareTeeManager | [`0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE`](https://coston2-explorer.flare.network/address/0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE) |

---

## Stack

| Layer | Path |
|-------|------|
| Product UI | `web/` (Vite + viem) |
| Sponsor API | `api/instruct.js` (operator pays C2FLR) |
| TEE extension | `tee/typescript/` (policy handlers) |
| Deploy / register tools | `tee/go/tools/` + `tee/scripts/` |
| Contracts | `tee/contracts/InstructionSender.sol` |

```bash
# UI (proxies /fcc → local TEE :6674)
cd web && npm ci && npm run dev

# Extension unit tests
cd tee/typescript && npm ci && npm test

# Full FCC stack (Docker) — see docs/SETUP.md
cd tee && cp .env.example .env   # fill keys
docker compose up -d
./scripts/pre-build.sh && ./scripts/post-build.sh
```

Operator runbook: [docs/SETUP.md](docs/SETUP.md) · [docs/PRODUCTION.md](docs/PRODUCTION.md)

---

## License

MIT — [LICENSE](LICENSE). Upstream FCC components © Flare Foundation.
