# Screen record + voice (≤1:30) — one take

Do **not** record Vercel for the TEE proof. Vercel is the public browse link (Demo mode = same policy rules).  
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

Open **http://127.0.0.1:5173**. Badge should say **Live TEE**. Status: **Live Coston2 TEE**.

If you see `NetworkError when attempting to fetch resource`, use `VITE_DIRECT_URL=/fcc` (see `.env.example`) and restart `npm run dev`.

Also open a second tab ready:

https://coston2-explorer.flare.network/address/0x79bB3e509B6a0f43d506a761Fb022221c3FF0Ee9

## On-screen path (practice once without voice)

1. **FAssets** tab selected  
2. **Lock policy** → status OK (allowlist + cap)  
3. **Sign** → Approved  
4. **Overspend** → Blocked (~2s)  
5. Reset amount / match recipient, then **Wrong addr** → Blocked  
6. Switch to explorer tab (InstructionSender visible)

## Voice track (~90s) — speak while clicking

**0:00–0:12**  
CipherSign is a Flare payout vault. The key lives in a TEE. It only signs when the allowlist, max amount, and expiry say yes.

**0:12–0:28**  
Built for Flare users today — FAssets executor fees, keeper bots, FTSO reward forwarders — so a compromised script cannot drain.

**0:28–1:05** *(do the clicks)*  
This is live on Coston2 FCC via `/direct`. I lock the FAssets policy… sign passes… overspend blocked… wrong address blocked.

**1:05–1:20**  
Flare path: InstructionSender to TeeExtensionRegistry into CipherSign. Ops UPDATE, SET_POLICY, SIGN. Deployed on Coston2.

**1:20–1:30**  
Demo and repo are public. Summer Signal Bounty 2 — Confidential Compute.

## After export

1. Upload YouTube  
2. Paste URL into DoraHacks + `docs/SUBMISSION.md`  
3. Keep https://cipher-sign.vercel.app · https://dorahacks.io/buidl/47182/ · https://github.com/thesithunyein/cipher-sign  

## Do not

- Record only the Vercel Demo badge and claim it is live TEE  
- Skip the overspend / wrong-addr rejects  
