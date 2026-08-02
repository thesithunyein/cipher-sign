# Production deployment (real product path)

## Product path (required)

Lock rules and Approve payout **must** go through the on-chain contract:

`/api/instruct (sponsor key pays gas) → InstructionSender.setPolicy / .sign (Coston2) → TeeExtensionRegistry → CipherSign TEE → GET /action/result/:instructionId`

The app shows a **Coston2 explorer transaction** for every Lock / Approve.  
**Users pay $0 network fees** — set `SPONSOR_PRIVATE_KEY` (funded Coston2 key) on Vercel / local `tee/.env` as `PRIVATE_KEY`.  
`POST /direct` is **not** the product path (kept only for operator smoke scripts).

## Simulated vs hardware TEE

| Mode | Env | Where it runs | Attestation |
|------|-----|---------------|-------------|
| Simulated (dev / Coston2 guides) | `SIMULATED_TEE=true`, `TEE_MODE=1` | Local Docker | `magic_pass` / `TEST_PLATFORM` |
| **Production hardware** | `SIMULATED_TEE=false`, `TEE_MODE=0` | **GCP Confidential Space VM** | Real Confidential Space attestation |

Flare docs: production attestation verification **rejects** simulated attestations.  
You **cannot** get hardware TEE by flipping a flag on a laptop Docker stack.

### Hardware TEE checklist

1. Provision a GCP Confidential Space VM per Flare FCC production deployment (`DEPLOYMENT_STEPS` in Flare’s FCC scaffold / sign-extension guide).
2. In `tee/.env`:
   ```bash
   LOCAL_MODE=false
   SIMULATED_TEE=false
   TEE_MODE=0
   CHAIN_ID=114   # or Songbird/Flare when your target network is live for user extensions
   ```
3. Rebuild/restart: `docker compose build extension-tee && ./scripts/start-services.sh`
4. Re-register the machine (`post-build` / `register-tee -command rRap`) so on-chain attestation matches hardware.
5. Confirm `GET /info` no longer reports `attestation: "magic_pass"` or platform `TEST_PLATFORM`.
6. Product UI Connect toast should say **hardware TEE** (not simulated).

Until step 5 is true, the product is **on-chain real** but the enclave attestation is still **simulated** — the UI labels that honestly.

## Operator runbook (Coston2)

1. Funded MetaMask on Coston2 (C2FLR for gas + instruction fee).
2. TEE stack up; named tunnel to `:6674` (not a disposable quick tunnel if you need uptime).
3. `INSTRUCTION_SENDER` / `EXTENSION_ID` from `tee/config/extension.env`.
4. Web env: `VITE_INSTRUCTION_SENDER`, `VITE_DIRECT_URL` (proxy to proxy), fee/RPC/explorer.
5. Connect wallet → Lock rules on-chain → Approve on-chain → open explorer tx in proof panel.

## What “done” means

- [ ] Every Approve has a Coston2 explorer tx hash from `InstructionSender.sign`
- [ ] TEE result polled by instruction id (not `/direct`)
- [ ] ECDSA recover matches vault address
- [ ] `/info` shows non-simulated attestation (hardware TEE)
