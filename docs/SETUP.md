# CipherSign TEE setup (Coston2)

Aligned with Flare’s [FCC getting-started](https://dev.flare.network/fcc/guides/getting-started) (Jul 2026). Local Docker + simulated TEE + HTTPS tunnel against live Coston2. GCP Confidential Space is not required for this path.

Upstream FCC may still be unstable — if registration/signing fails after a clean setup, wait for Flare’s pin and retry. Product unit tests and the demo UI do not need a live TEE.

## Prerequisites

| Tool | Why |
|------|-----|
| Docker Desktop (WSL2 on Windows) | `redis` + `ext-proxy` + `extension-tee` |
| Go 1.23+ | deploy / register tools under `tee/go/tools` |
| Foundry (`forge`) | Solidity compile for bindings |
| cloudflared or ngrok | Public HTTPS → host **6674** |
| Funded Coston2 wallet | Deploy + fees (faucet: https://faucet.flare.network/) |
| Indexer DB user/pass | From Flare Telegram support |

Confirm: `docker version`, `go version`, `forge --version`.

## Quick path

Prefer **Git Bash / WSL** from `tee/`:

```bash
cd tee
cp .env.example .env
# Fill PRIVATE_KEY, INITIAL_OWNER, DIRECT_API_KEY
# Set LOCAL_MODE=false and SIMULATED_TEE=true
# Leave EXT_PROXY_URL empty until the tunnel is up

cp config/proxy/extension_proxy.coston2.toml.example \
   config/proxy/extension_proxy.toml
# Fill [db] host/user/password (working host used in Summer Signal: 34.38.42.208 — confirm if Flare rotates)
```

### 1. Tunnel first

```bash
cloudflared tunnel --url http://localhost:6674
# or: ngrok http 6674
```

Put the HTTPS URL in `.env` as both (scripts accept either):

```bash
EXT_PROXY_URL="https://<your-tunnel-domain>"
TUNNEL_URL="https://<your-tunnel-domain>"
```

Anyone with the tunnel URL can hit your proxy API — Coston2 only; stop the tunnel when done.

### 2. Deploy + register extension

```bash
./scripts/pre-build.sh
```

Writes `config/extension.env` (`EXTENSION_ID`, `INSTRUCTION_SENDER`).

If that file already exists, pre-build **refuses** to run. Use `./scripts/pre-build.sh --force` only when you intentionally want a **new** extension ID (casual force breaks e2e with mismatches like `MachineManager.TooMany()`).

### 3. Start stack

```bash
./scripts/start-services.sh
```

Wait / confirm:

```bash
curl -sf http://localhost:6674/info | jq .
source .env && curl -sf "$EXT_PROXY_URL/info" | jq .
```

### 4. Register TEE machine

```bash
./scripts/post-build.sh
```

### 5. Test

```bash
./scripts/test-direct.sh   # /direct path (demo-friendly)
# or
./scripts/test.sh          # on-chain instruction path
```

Or one shot (tunnel + `.env` + toml must already be ready):

```bash
./scripts/full-setup.sh --test
```

Stop:

```bash
./scripts/stop-services.sh
```

## Ports

| Service | Container | Host |
|---------|-----------|------|
| ext-proxy external (tunnel this) | 6664 | **6674** |
| ext-proxy internal | 6663 | 6675 |
| redis | 6379 | 6383 |

## Env checklist

Required for live Coston2:

- `PRIVATE_KEY` — hex, no `0x`
- `INITIAL_OWNER` — matching address
- `LOCAL_MODE=false`
- `SIMULATED_TEE=true`
- `EXT_PROXY_URL` — public tunnel to **6674**
- `NORMAL_PROXY_URL=https://tee-proxy-coston2-1.flare.rocks`
- `TEE_NODE_VERSION=develop` / `TEE_PROXY_VERSION=develop` (Docker build)

Optional: `DIRECT_API_KEY` for web live mode (`VITE_DIRECT_URL` + `VITE_DIRECT_API_KEY`).

## Extension tests only (no Docker)

```powershell
cd tee\typescript
npm ci
npm test
```

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Proxy never healthy | Indexer `[db]`, `docker compose logs ext-proxy`, tunnel to **6674** |
| Pre-build refuses | `config/extension.env` exists — `--force` only if you want a new ID |
| `InvalidGovernanceHash` | `GOVERNANCE_*` match what the container saw; rebuild after changes |
| Attestation / register fail | `LOCAL_MODE=false`, `SIMULATED_TEE=true`, `NORMAL_PROXY_URL` |
| Tunnel URL changed | Update `EXT_PROXY_URL` / `TUNNEL_URL` and re-run post-build if needed |

Upstream guide: https://dev.flare.network/fcc/guides/getting-started
