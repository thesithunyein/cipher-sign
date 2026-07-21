#!/usr/bin/env bash
# test-direct.sh — Test the sign extension using the proxy's /direct endpoint,
# bypassing on-chain contract calls entirely.
#
# Run this AFTER post-build.sh (TEE machine must be registered and running)
# and after enabling [direct] in config/proxy/extension_proxy.toml.
#
# Inputs (env vars):
#   EXT_PROXY_URL   — extension proxy URL (default: http://localhost:6674)
#   DIRECT_API_KEY  — API key for the /direct endpoint
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[test-direct]${NC} $*"; }
step() { echo -e "\n${CYAN}=== Step $1: $2 ===${NC}"; }
die()  { echo -e "${RED}[test-direct] ERROR:${NC} $*" >&2; exit 1; }

# --- Load .env from project root (if present) ---
if [[ -f "$PROJECT_DIR/.env" ]]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

EXT_PROXY_URL="${EXT_PROXY_URL:-${TUNNEL_URL:-http://localhost:6674}}"
DIRECT_API_KEY="${DIRECT_API_KEY:-}"

[[ -n "$DIRECT_API_KEY" ]] || die "DIRECT_API_KEY not set. Add it to .env or export it."

log "Extension proxy: $EXT_PROXY_URL"

# --- Pre-flight: verify extension proxy is reachable ---
if ! curl -sf -o /dev/null "$EXT_PROXY_URL/info" 2>/dev/null; then
    die "Extension proxy not reachable at $EXT_PROXY_URL. Is Docker Compose running? (docker compose up -d)"
fi
log "Extension proxy is reachable"

# --- Run direct test ---
step 1 "Run direct extension tests (bypassing smart contract)"
cd "$PROJECT_DIR/go/tools"
go run ./cmd/run-test-direct \
    -p "$EXT_PROXY_URL" \
    -api-key "$DIRECT_API_KEY" \
    || die "Direct test failed"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Direct tests passed${NC}"
echo -e "${GREEN}========================================${NC}"
