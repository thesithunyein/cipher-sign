# TEE Extension Example - Private Key Manager

CipherSign Coston2 runbook (ports, tunnel, `--force`): see [`docs/SETUP.md`](../docs/SETUP.md).
Aligned with [Flare FCC getting-started](https://dev.flare.network/fcc/guides/getting-started) (tunnel → **6674**, `LOCAL_MODE=false`, `SIMULATED_TEE=true`, `develop` branches).

An example TEE extension that stores a private key and signs messages with it.
Use this as a **hackathon starter template**: clone it, modify the code to create
your own extension, then deploy/register/test it on Coston2.

> **Warning**: This repo is for demonstration purposes only. Storing encrypted
> secrets on-chain is not advisable in production — on-chain data is public
> and encryption can be broken over time. A production extension should use
> off-chain channels for secret delivery.

## For Hackathon Participants

Pick the language you're most comfortable with and work inside its directory.
You should modify the files in `app/` and the shared
`contract/InstructionSender.sol`. The files in `base/` are framework
infrastructure -- you should not need to modify them.

| Language   | Directory                    | Test command                                                        |
| ---------- | ---------------------------- | ------------------------------------------------------------------- |
| Go         | [`go/`](go/)                 | `cd go && go test ./...`                                            |
| Python     | [`python/`](python/)         | `cd python && python3 -m unittest discover -s tests -p 'test_*.py'` |
| TypeScript | [`typescript/`](typescript/) | `cd typescript && npm ci && npm test`                               |

See each directory's `README.md` for details on the handler signature, what's
provided by `base/`, and what files to change.

### Agent skills (optional)

Install the skill for agentic coding:

```bash
npx skills add .
```

## Shared contract

`contract/InstructionSender.sol` is shared across all implementations. Update it
to match your extension's OPType/OPCommand constants.

## Deploying and Testing on Coston2

Run the sign extension locally, expose it to the internet via a tunnel
(cloudflared, ngrok, etc.), and register + test it on the Coston2 testnet
(chain ID 114).

Instructions are sent directly to the TEE proxy via its `POST /direct`
endpoint, bypassing the InstructionSender smart contract. This is the
recommended way to interact with the extension.

All deployment, registration, and testing tools are in `go/tools/` and work
for **all extension languages**. Set `LANGUAGE` in `.env` to choose which
Docker image to build.

See [`go/README.md`](go/README.md#tools-gotools) for tool details.

### Prerequisites

- Docker
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
  to expose a local port to the internet (no account required; [ngrok](https://ngrok.com/) also works but needs sign-up)
- A funded Coston2 wallet (needs C2FLR for gas + TEE registration fees)
- Go >= 1.23 (for the deployment/registration tools in `go/tools/`)
- Access to a Coston2 C-chain indexer database (the proxy requires it on startup)

### Quick start (scripted)

Once your environment is configured (step 0 below), you can run the entire
deploy → start → register → test flow with a single command:

```bash
./scripts/full-setup.sh --test
```

Or run each phase individually:

```bash
# 1. Deploy contract + register extension → writes config/extension.env
./scripts/pre-build.sh

# 2. Build and start Docker stack, wait for health
./scripts/start-services.sh

# 3. Register TEE version + TEE machine on-chain
./scripts/post-build.sh

# 4. Run the end-to-end test (via /direct, no contract interaction)
./scripts/test-direct.sh

# Stop everything
./scripts/stop-services.sh
```

The scripts read configuration from `.env` and auto-detect the addresses file.
`pre-build.sh` writes the generated `EXTENSION_ID` and `INSTRUCTION_SENDER` to
`config/extension.env`, which all later scripts pick up automatically.

---

### Manual steps

The sections below walk through each step individually, which is useful for
understanding the flow or debugging issues.

### Step 0: Configure environment

```bash
cp .env.example .env
# Edit .env and fill in:
#   PRIVATE_KEY       — funded Coston2 wallet private key
#   INITIAL_OWNER     — address derived from PRIVATE_KEY
#   LANGUAGE          — typescript (CipherSign) / go / python
#   LOCAL_MODE        — false on Coston2
#   SIMULATED_TEE     — true for hackathon simulated TEE
#   EXT_PROXY_URL     — public tunnel to host port 6674
#   DIRECT_API_KEY    — any secret string for /direct endpoint auth

cp config/proxy/extension_proxy.coston2.toml.example config/proxy/extension_proxy.toml
# Edit config/proxy/extension_proxy.toml:
#   [db] section      — fill in username and password for the Coston2 C-chain
#                        indexer. The proxy requires a DB connection on startup.
#   [direct] section  — already enabled in the example config.
```

> **Note**: The proxy connects to the C-chain indexer database on startup.
> If the DB is unreachable or the credentials are wrong, the proxy will crash.
> Make sure the `[db]` section in `extension_proxy.toml` has valid credentials.
>
> `pre-build.sh` refuses to overwrite an existing `config/extension.env`.
> Use `./scripts/pre-build.sh --force` only when you intentionally want a new extension ID.

### Step 1: Deploy contract and register extension

```bash
cd go/tools
go run ./cmd/deploy-contract
```

Save the printed address in `.env` as `INSTRUCTION_SENDER`, then register:

```bash
go run ./cmd/register-extension
```

Save the printed extension ID in `.env` as `EXTENSION_ID`.

> Or run `./scripts/pre-build.sh` to do both steps and write
> `config/extension.env` automatically.

### Step 2: Start the extension stack

```bash
docker compose build
docker compose up -d
```

Wait for the proxy to become healthy:

```bash
until curl -sf http://localhost:6674/info >/dev/null 2>&1; do sleep 2; done
echo "Extension proxy is ready"
```

### Step 3: Start tunnel

In a separate terminal, expose the extension proxy port (**6674**) to the internet:

```bash
# Using cloudflared (no account required):
cloudflared tunnel --url http://localhost:6674

# Or using ngrok:
ngrok http 6674
```

Note the public HTTPS URL and add it to `.env`:

```bash
# Add to .env (guide name: EXT_PROXY_URL; TUNNEL_URL still works for Go tools)
EXT_PROXY_URL="https://<your-tunnel-url>"
TUNNEL_URL="https://<your-tunnel-url>"
```

> **Note**: The tunnel must stay running for the entire session. If your
> computer sleeps or restarts, restart the tunnel and update `EXT_PROXY_URL`
> / `TUNNEL_URL` in `.env` with the new URL.
>
> Prefer starting the tunnel **before** `start-services` / `post-build` so
> registration uses the public URL.

### Step 4: Add TEE version

```bash
cd go/tools
go run ./cmd/allow-tee-version -p http://localhost:6674
```

### Step 5: Register the TEE machine

Make sure `EXT_PROXY_URL` / `TUNNEL_URL` is set correctly in `.env`.

```bash
cd go/tools
go run ./cmd/register-tee -p http://localhost:6674 -l
```

The `-l` flag enables local/test mode (required when the TEE returns a test
attestation token instead of a real GCP JWT).

### Step 6: Test via direct mode

Send instructions directly to the proxy's `POST /direct` endpoint, bypassing
the smart contract:

```bash
./scripts/test-direct.sh
```

The test will:

1. Fetch the TEE's public key from the proxy
2. ECIES-encrypt a test private key
3. Send `updateKey` via `POST /direct` and poll for the result
4. Send `sign` via `POST /direct` and poll for the result
5. Verify the returned signature matches the test private key

You can also send instructions manually with curl:

```bash
# updateKey — store an encrypted private key
curl -X POST http://localhost:6674/direct \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DIRECT_API_KEY" \
  -d '{
    "opType":    "0x4b45590000000000000000000000000000000000000000000000000000000000",
    "opCommand": "0x5550444154450000000000000000000000000000000000000000000000000000",
    "message":   "0x<ECIES-encrypted-private-key>"
  }'

# sign — sign a message with the stored key
curl -X POST http://localhost:6674/direct \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DIRECT_API_KEY" \
  -d '{
    "opType":    "0x4b45590000000000000000000000000000000000000000000000000000000000",
    "opCommand": "0x5349474e00000000000000000000000000000000000000000000000000000000",
    "message":   "0x48656c6c6f"
  }'
```

The `opType` and `opCommand` values are UTF-8 strings right-padded to 32 bytes
(matching Solidity's `bytes32("KEY")`, `bytes32("UPDATE")`, `bytes32("SIGN")`).

The response is the generated Action JSON containing the action ID. Poll
`GET /action/result/<action-id>` for the result.

---

## Port reference

| Service            | Container port | Host port |
| ------------------ | -------------- | --------- |
| ext-proxy internal | 6663           | 6675      |
| ext-proxy external | 6664           | **6674**  |
| redis              | 6379           | 6383      |

The tunnel exposes host port **6674** (ext-proxy external) to the internet.

## Troubleshooting

### Proxy won't start / DB sync error

The proxy needs a synced C-chain indexer DB. Check the proxy logs and verify
the DB credentials in `config/proxy/extension_proxy.toml`:

```bash
docker compose logs ext-proxy
```

### Transaction reverts

Ensure your wallet has enough C2FLR for gas + fees. The TEE fee calculator
determines the required fee for each operation.

### to-production times out

Try restarting the proxy — it may have missed a signing policy round:

```bash
docker compose down
docker compose up -d
```

If that doesn't help, the FDC attestation flow requires active relay providers
on Coston2. If no relay infrastructure is running, the availability check won't
complete.

### Tunnel URL changed

If your tunnel restarts and the URL changes, update `EXT_PROXY_URL` / `TUNNEL_URL` in `.env`
and restart the Docker stack (`docker compose down && docker compose up -d`),
then re-run steps 5-6 (allow-tee-version + register-tee) to register a new
TEE machine with the new URL.

## Cleanup

To shut down all local services and prepare for a fresh start:

### Stop the Docker stack

```bash
./scripts/stop-services.sh
# or: docker compose down
```

This stops and removes all containers (redis, ext-proxy, extension-tee).

### Full reset (start from scratch)

If you want to completely reset and follow the README from the beginning:

```bash
# Remove built images (forces rebuild)
docker compose down --rmi local

# Clear environment state
rm -f .env config/proxy/extension_proxy.toml config/extension.env
```

After a full reset, start again from [Step 0](#step-0-configure-environment).

> **Note**: On-chain state (deployed contracts, registered extensions, registered
> TEEs) cannot be reset. Each fresh start will deploy a new InstructionSender
> contract and register a new extension. This is fine for testing — Coston2 is
> a testnet.
