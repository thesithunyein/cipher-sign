# Screen record + voice (≤1:30) — one take

Do **not** record Vercel for the TEE proof. Vercel is the public browse link (same policy rules).  
Record **local live TEE** so judges see real `/direct`.

## Before you press Record (run once)

```powershell
# 1) TEE up
curl http://127.0.0.1:6674/info

# 2) Seed vault key + prove gate
cd C:\Users\sithu\Projects\cipher-sign\web
npm run live:smoke

# 3) Live UI (Vite proxies /fcc → TEE :6674 — no CORS)
npm run dev
```

Open **http://127.0.0.1:5173**. Status should say **Live TEE connected**.

If you see `NetworkError when attempting to fetch resource`, you are hitting `:6674` from the browser without the proxy — use `VITE_DIRECT_URL=/fcc` (see `.env.example`) and restart `npm run dev`.

Also open a second tab ready:

https://coston2-explorer.flare.network/address/0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9

## On-screen path (practice once without voice)

1. Payroll selected  
2. **Lock policy** → status OK  
3. **Sign** → Approved / signature  
4. **Overspend** → Rejected (leave message visible ~2s)  
5. Switch to explorer tab (InstructionSender address visible)

## Voice track (~90s) — speak while clicking

**0:00–0:12**  
CipherSign keeps signing keys inside a Flare TEE. Policy decides what can be signed — recipient, max amount, expiry.

**0:12–0:28**  
Hot wallets can sign anything. For agent payroll or OTC that is not safe. CipherSign enforces the rules inside the enclave, not a mutable backend.

**0:28–1:05** *(do the clicks)*  
This is live against Coston2 FCC via `/direct` — not a UI mock. I lock SET_POLICY… request a signature… it passes. Over-cap attack… rejected by the TEE.

**1:05–1:20**  
On Flare: InstructionSender to TeeExtensionRegistry into our CipherSign extension. Ops UPDATE, SET_POLICY, SIGN. Twenty-eight unit tests. Deployed InstructionSender on Coston2.

**1:20–1:30**  
Demo and repo are public. Next: agent SDK and Protocol Managed Wallets. Built for Summer Signal Bounty 2 — Confidential Compute.

## After export

1. Upload unlisted YouTube (or Drive)  
2. Paste URL into DoraHacks + `docs/SUBMISSION.md`  
3. Keep https://cipher-sign.vercel.app and https://github.com/thesithunyein/cipher-sign in the description  

## Do not

- Record only Vercel (no live TEE env there)  
- Apologize about tunnels / FCC instability  
- Show terminal errors or `.env` secrets  
