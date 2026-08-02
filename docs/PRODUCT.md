# CipherSign — Product brief

**One job:** Help teams that send **fees, payroll, or rewards** stop **overpay** and **wrong-person** mistakes before a payout is approved.

Not a trading app. Not a demo sandbox. Not a fake explorer badge.

---

## Problem (real money ops)

Teams move stablecoins / tokens to contractors, fee wallets, and reward recipients using:

1. A **hot wallet / bot key** that can sign anything, or  
2. A **multisig** that is too slow for every small payout, or  
3. A **custodian policy engine** (Fireblocks-class) that most Flare/ops teams cannot buy.

Failure modes that actually hurt:

| Mistake | Cost |
|---------|------|
| Typo / poisoned address | Funds to wrong person |
| Amount fat-finger / script bug | Overpay or drain |
| Stale automation key | Forever-valid signer with no cap |

Industry pattern (2025–2026 treasury ops): **allowlist + amount thresholds + maker-checker**, encoded in policy — not trust in a spreadsheet.

---

## Market landscape (crowdedness: **moderate**)

### Direct / near competitors

| Player | Approach | Gap for our ICP |
|--------|----------|-----------------|
| **Safe + Spending Limit / Allowance module** | Cap what a delegate can pull from a Safe | Owners can reconfigure modules; not “key cannot sign outside policy” |
| **Fireblocks / Copper policy engines** | Allowlist, amounts, approvals, audit | Expensive enterprise custody; not Flare-native self-serve |
| **Parcel / payroll-on-Safe projects** | Payroll UX on Safe allowances | Chain-agnostic payroll; little Flare TEE story |
| **Streaming (Sablier, Superfluid)** | Continuous pay | Wrong problem for one-shot fees/rewards with hard caps |

### Substitutes (same pain, different tool)

- Multisig every payout (Safe) — secure, slow  
- Spreadsheet + dual human check — process, not enforcement  
- “Just be careful” with MetaMask — not a control  

### Dead / weak patterns

- Pure hackathon “sign anything” demos — no policy  
- UI-only validation — bypassable  
- Fake local signatures — not verifiable  

### CipherSign wedge

**Policy-gated ECDSA inside a Flare TEE:** allowlist + max amount + optional expiry enforced **before the key is used**. Break the rules → **no signature**.

Differentiation vs Safe modules: rules bind the **signing key material**, not only a spend module that owners can swap.  
Differentiation vs Fireblocks: Flare Confidential Compute path for teams already on Flare / Coston2 — self-hosted vault, not a custody SaaS seat.

Crowdedness: **moderate**. Category exists; Flare TEE + simple finance-ops UX for fees/payroll/rewards is underserved.

---

## ICP (who we build for)

Primary: **Finance / ops leads on small–mid crypto teams** who:

- Pay **vendor fees**, **contractor payroll**, or **partner rewards** on-chain  
- Need automation or a single operator without a drainable hot key  
- Will lock **who** + **how much** once, then approve many payouts  

Non-goals (v1):

- DEX / swap / trading  
- Full HR payroll (tax, fiat off-ramp, KYC)  
- Replacing Safe for large DAO governance  
- Fake offline “preview approve” that mints fake proofs  

---

## Product surface (v1 — real only)

1. **Connect wallet** → MetaMask on Coston2 + live TEE `/info` (required).  
2. **Rules** → allowlist + limit → **Lock on-chain** via `InstructionSender.setPolicy`.  
3. **Send** → **Approve on-chain** via `InstructionSender.sign` (wallet tx + fee).  
4. **Proof** → Coston2 explorer tx + TEE ABI `(intent, signature)` + ECDSA recover.  
5. **Activity** → session log with tx hashes.  

`POST /direct` is **not** a product path. See [PRODUCTION.md](PRODUCTION.md).

Payout types (templates only — same engine):

- **Fee payouts**  
- **Team payroll**  
- **Rewards**  

---

## What “real proof” means (v1)

| Layer | Status |
|-------|--------|
| Wallet tx to `InstructionSender` on Coston2 | **Required** |
| Explorer link for that tx | **Required** |
| Rules enforced in TEE before SIGN | **Required** |
| ECDSA recover + match vault address | **Required** |
| Hardware Confidential Space attestation | **Required for production TEE** (`SIMULATED_TEE=false`, `TEE_MODE=0` on GCP) |

A green chip alone is **not** proof. `/direct` alone is **not** the product.

---

## Build order

1. Kill fake / offline approve paths  
2. Expose `vaultAddress` from TEE state  
3. Verify approvals in the product UI  
4. Keep copy honest: teams · fees · payroll · rewards  
5. Later: on-chain settlement + explorer link  

---

## Success metrics (product, not hackathon)

- Operator can lock rules and approve a valid payout end-to-end on live vault  
- Over-limit and wrong-payee are blocked by the vault (not the browser)  
- Approval shows **Verified** with recovered vault address  
- No path produces a fake signature that the UI calls “approved”  
