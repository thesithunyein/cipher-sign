# Day-0 setup (Windows)

CipherSign cannot register on Coston2 without these. Install in this order.

## 1. Docker Desktop

1. Install: https://www.docker.com/products/docker-desktop/
2. Enable WSL2 backend if prompted
3. Confirm: `docker version`

## 2. Go 1.23+

1. Install: https://go.dev/dl/
2. Confirm: `go version`
3. Needed for `tee/go/tools` deploy + register commands

## 3. cloudflared (or ngrok)

```powershell
winget install Cloudflare.cloudflared
```

## 4. Coston2 wallet

1. Create a throwaway wallet (MetaMask → add Coston2 chain id `114`)
2. Faucet: https://faucet.flare.network/
3. Put key (no `0x`) into `tee/.env` as `PRIVATE_KEY`
4. Put address into `INITIAL_OWNER`

## 5. Indexer DB credentials

`tee/config/proxy/extension_proxy.toml` needs Coston2 C-chain indexer DB user/pass.
If missing from docs, ask in: https://t.me/+5Vn6ZKhr6KI3NjIx

## 6. Run extension tests (no Docker)

```powershell
cd tee\typescript
npm ci
npm test
```

## 7. Full Coston2 path (needs Docker + Go)

Prefer **Git Bash / WSL**:

```bash
cd tee
cp .env.example .env   # fill values
cp config/proxy/extension_proxy.toml.example config/proxy/extension_proxy.toml
./scripts/full-setup.sh --test
```

## If Docker install will take days

Do not stall. Finish demo UI + unit tests + Loom storyboard today.
Switch to Bounty 1 only if Docker is still blocked after 48 hours.
