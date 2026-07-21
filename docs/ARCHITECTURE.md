# CipherSign architecture (judge-facing)

## One-liner

Confidential signing vault: keys stay in a Flare TEE; signatures only release when policy (recipient, max amount, expiry) passes inside the enclave.

## Why Flare (not a Web2 vault)

| Layer | Role |
|-------|------|
| `InstructionSender.sol` | On-chain entry: `updateKey`, `setPolicy`, `sign` |
| Flare `TeeExtensionRegistry` | Routes instructions to registered TEE machines |
| CipherSign extension (TypeScript) | Runs in TEE; enforces policy before ECDSA |
| `/direct` API | Hackathon-reliable path (bypasses waiting on full on-chain roundtrip for demos) |

Removing Flare removes the **attested TEE + registry** trust model. A normal server can silently change policy or exfiltrate keys.

## Ops

1. `KEY` / `UPDATE` — load encrypted private key into TEE  
2. `KEY` / `SET_POLICY` — ABI `(address recipient, uint256 maxAmount, uint256 expiresAt)`  
3. `KEY` / `SIGN` — ABI intent `(address, uint256 amount, uint256 deadline, bytes32 payloadHash)`  
   - Rejects if no key, no policy, expired, wrong recipient, or amount > max  

## Networks

- **Demo / hackathon:** Coston2 (`114`)  
- **Later:** Songbird / Flare when FCC production TEEs are available  

## Trust assumptions (honest)

- Demo uses Flare’s simulated local TEE stack against Coston2 (official hackathon path).  
- Encrypted key delivery to TEEs is demo-grade; production should use Flare’s recommended secret channels.  
- Policy is enforced in extension memory for the running TEE instance.

## Repo map

```
tee/typescript/src/app/   # CipherSign handlers (product logic)
tee/contract/             # InstructionSender
web/                      # Judge demo UI (demo + live /direct)
docs/                     # Setup, submission, Telegram request
```
