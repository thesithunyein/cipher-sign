<p align="center">
  <img src="docs/logo-mark.png" alt="CipherSign" width="88" height="88" />
</p>

<h1 align="center">CipherSign</h1>

<p align="center">
  <em>Flare · Confidential Compute</em><br/>
  <strong>Payouts that cannot overspend.</strong>
</p>

<p align="center">
  Policy-gated signing for FAssets executors, Flare bots, and FTSO forwarders.<br/>
  Keys stay in a TEE. Allowlist, cap, and expiry are enforced in the enclave.
</p>

<p align="center">
  <a href="https://cipher-sign.vercel.app"><strong>Open live product →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://dorahacks.io/buidl/47182/">DoraHacks</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/thesithunyein/cipher-sign">GitHub</a>
</p>

<p align="center">
  <a href="https://cipher-sign.vercel.app">
    <img src="docs/app-hero.png" alt="CipherSign live app — Live TEE, product bar, FAssets vault" width="920" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live%20TEE-30d158?style=for-the-badge&labelColor=0B0B12" alt="Live TEE" />
  <img src="https://img.shields.io/badge/App-cipher--sign.vercel.app-8B5CF6?style=for-the-badge&labelColor=0B0B12" alt="App" />
  <img src="https://img.shields.io/badge/Tests-29%2F29-30d158?style=for-the-badge&labelColor=0B0B12" alt="Tests" />
</p>

---

## The product

A hot wallet signs anything you ask. That is fine for demos — and fatal for payout automation.

**CipherSign** holds the key inside a Flare TEE. Every signature request is gated by a locked policy **in the enclave**, not in a mutable backend:

| Rule | What it stops |
|------|----------------|
| **Allowlist** | Payments to unknown recipients |
| **Max amount** | Overspend / drain |
| **Expiry** | Forever-valid keys |

Break the rules → **no signature**. Period.

### Built for Flare operators today

| Mode | Job |
|------|-----|
| **FAssets** | Executor fee vault — fixed fee recipient + hard cap |
| **Bot** | Keeper / automation payouts without a drainable hot key |
| **FTSO** | Reward forwarder locked to one payout address |

---

## Try it (60 seconds)

1. Open **[cipher-sign.vercel.app](https://cipher-sign.vercel.app)** — badge should read **Live TEE** when the operator node is up  
2. Pick **FAssets / Bot / FTSO**  
3. **Lock policy** → **Sign** a valid payout  
4. Hit **Overspend** or **Wrong addr** — the vault refuses  

If Live is offline, **Preview** still runs the same allowlist / cap / expiry rules so the product never goes dark for judges.

---

## How it uses Flare

```mermaid
flowchart LR
  A[Client] --> B[InstructionSender]
  B --> C[TeeExtensionRegistry]
  C --> D[CipherSign TEE]
  D -->|policy OK| E[ECDSA signature]
  D -->|fail| F[Reject — no key use]
```

Inside the enclave:

1. `KEY / UPDATE` — create the signing key  
2. `KEY / SET_POLICY` — lock allowlist, max amount, expiry  
3. `KEY / SIGN` — release ECDSA only if the intent passes  

```mermaid
sequenceDiagram
  participant Ops as Operator
  participant TEE as CipherSign TEE
  Ops->>TEE: SET_POLICY
  Ops->>TEE: SIGN valid intent
  TEE-->>Ops: signature
  Ops->>TEE: SIGN over-cap / wrong recipient
  TEE-->>Ops: reject
```

---

## On-chain proof (Coston2)

| | |
|---|---|
| Network | Flare Testnet Coston2 (`114`) |
| InstructionSender | [`0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9`](https://coston2-explorer.flare.network/address/0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9) |
| EXTENSION_ID | `0x…0665` |
| Deployer | `0xc73Be03499616FFaA79315673e620AACfbb920C4` |

---

## Why this wins Bounty 2

| Criterion | CipherSign |
|-----------|------------|
| **Useful** | Real Flare jobs — FAssets fees, bots, FTSO forwarders |
| **Flare-native** | InstructionSender → registry → attested TEE extension |
| **Technical** | Policy-gated `SIGN`, 29/29 tests, attack buttons that fail closed |
| **New work** | Allowlist model + Live product UI — not Hello World |
| **Clarity** | One live URL, one vault, one story |

```bash
cd web && npm ci && npm run dev          # product UI
cd tee/typescript && npm test            # 29/29
```

Docs: [Architecture](docs/ARCHITECTURE.md) · [Setup](docs/SETUP.md) · [Demo script](docs/DEMO_SCRIPT.md) · [Submission](docs/SUBMISSION.md)

---

## Project structure

Exact match to files tracked in this repository:

```text
cipher-sign/
├── .github/
│   └── workflows/
│       └── build-demo.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEMO_SCRIPT.md
│   ├── DORAHACKS_PASTE.md
│   ├── FEEDBACK.md
│   ├── SETUP.md
│   ├── SUBMISSION.md
│   ├── app-hero.png
│   ├── ciphersign-logo-480.png
│   ├── ciphersign-logo-480.svg
│   ├── logo-mark.png
│   ├── logo-mark.svg
│   └── logo.svg
├── tee/
│   ├── .env.example
│   ├── .gitignore
│   ├── README.md
│   ├── docker-compose.yaml
│   ├── config/
│   │   ├── coston2/
│   │   │   └── deployed-addresses.json
│   │   └── proxy/
│   │       ├── extension_proxy.toml.example
│   │       ├── extension_proxy.coston2.toml.example
│   │       └── extension_proxy.coston2.docker.toml.example
│   ├── contract/
│   │   ├── InstructionSender.sol
│   │   ├── foundry.toml
│   │   └── interface/
│   │       ├── ITeeExtensionRegistry.sol
│   │       └── ITeeMachineRegistry.sol
│   ├── proxy/
│   │   └── Dockerfile
│   ├── scripts/
│   │   ├── full-setup.sh
│   │   ├── generate-bindings.sh
│   │   ├── post-build.sh
│   │   ├── pre-build.sh
│   │   ├── start-services.sh
│   │   ├── stop-services.sh
│   │   ├── test-direct.sh
│   │   └── test.sh
│   ├── typescript/                    # CipherSign TEE extension (primary)
│   │   ├── Dockerfile
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app/
│   │       │   ├── abi.ts
│   │       │   ├── config.ts
│   │       │   ├── crypto.ts
│   │       │   └── handlers.ts      # KEY/UPDATE, SET_POLICY, SIGN
│   │       ├── base/
│   │       │   ├── crypto.ts
│   │       │   ├── encoding.ts
│   │       │   ├── server.ts
│   │       │   └── types.ts
│   │       └── __tests__/
│   │           ├── abi.test.ts
│   │           ├── base-crypto.test.ts
│   │           ├── crypto.test.ts
│   │           ├── encoding.test.ts
│   │           └── handlers.test.ts
│   └── go/                            # upstream FCC Go scaffold + tools
│       ├── Dockerfile
│       ├── README.md
│       ├── go.mod
│       ├── go.sum
│       ├── main.go
│       ├── cmd/docker/main.go
│       ├── internal/
│       │   ├── app/                   # abi, config, crypto, handlers, types (+ tests)
│       │   └── base/                  # crypto, encoding, server, types (+ tests)
│       └── tools/
│           ├── go.mod
│           ├── go.sum
│           ├── app/                   # deploy, generate, test + InstructionSender bindings
│           ├── base/                  # configs, support, hints, fccutils/
│           └── cmd/
│               ├── allow-tee-version/
│               ├── deploy-contract/
│               ├── register-extension/
│               ├── register-tee/
│               ├── run-test/
│               └── run-test-direct/
├── web/                               # Live product UI
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── live-direct-smoke.mjs
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vercel.json
│   ├── vite.config.ts
│   ├── public/
│   │   ├── bg-glow.png
│   │   ├── favicon.svg
│   │   ├── logo-mark.png
│   │   ├── logo-mark.svg
│   │   └── logo.svg
│   └── src/
│       ├── fcc.ts
│       ├── main.ts
│       └── style.css
├── .gitignore
├── LICENSE
├── README.md
└── vercel.json
```

Product code paths: **`web/`** and **`tee/typescript/`**. `tee/go` is upstream Flare FCC scaffold and deploy/register tools.

---

## License

MIT — [LICENSE](LICENSE). Upstream FCC scaffold © Flare Foundation.
