#!/usr/bin/env bash
# start-services.sh — Start CipherSign Docker Compose stack (Flare getting-started aligned).
#
# Prerequisites:
#   - config/extension.env from pre-build.sh (or EXTENSION_ID in .env)
#   - .env with PRIVATE_KEY, INITIAL_OWNER, LOCAL_MODE=false, SIMULATED_TEE=true
#   - config/proxy/extension_proxy.toml with indexer DB credentials
#   - Tunnel to localhost:6674; set EXT_PROXY_URL (or TUNNEL_URL) to that HTTPS URL
#
# Usage: ./scripts/start-services.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log() { echo -e "${GREEN}[start-services]${NC} $*"; }
die() { echo -e "${RED}[start-services] ERROR:${NC} $*" >&2; exit 1; }

if [[ -f "$PROJECT_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_DIR/.env"
    set +a
fi

CONFIG_FILE="$PROJECT_DIR/config/extension.env"
if [[ -f "$CONFIG_FILE" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$CONFIG_FILE"
    set +a
    log "Loaded config from $CONFIG_FILE"
fi

EXTENSION_ID="${EXTENSION_ID:-}"
[[ -n "$EXTENSION_ID" ]] || die "EXTENSION_ID not set. Run pre-build.sh first or set it in .env."

# Guide: EXT_PROXY_URL is the public tunnel. Local health uses host port 6674.
EXT_PROXY_URL="${EXT_PROXY_URL:-${TUNNEL_URL:-}}"
LOCAL_PROXY_URL="${LOCAL_PROXY_URL:-http://localhost:6674}"

[[ -f "$PROJECT_DIR/config/proxy/extension_proxy.toml" ]] \
  || die "Missing config/proxy/extension_proxy.toml — copy from extension_proxy.coston2.toml.example and fill [db]."

LOCAL_MODE="${LOCAL_MODE:-false}"
SIMULATED_TEE="${SIMULATED_TEE:-true}"
log "Extension ID:    $EXTENSION_ID"
log "LOCAL_MODE:      $LOCAL_MODE"
log "SIMULATED_TEE:   $SIMULATED_TEE"
log "Local proxy:     $LOCAL_PROXY_URL"
log "Public proxy:    ${EXT_PROXY_URL:-"(not set — set before post-build)"}"

cd "$PROJECT_DIR"
docker compose up -d --build || die "docker compose up failed"

log "Waiting for local extension proxy at $LOCAL_PROXY_URL/info ..."
elapsed=0
timeout=180
while ! curl -sf -o /dev/null "$LOCAL_PROXY_URL/info" 2>/dev/null; do
    elapsed=$((elapsed + 2))
    if [[ $elapsed -ge $timeout ]]; then
        die "Timed out after ${timeout}s waiting for local proxy ($LOCAL_PROXY_URL). Check: docker compose logs ext-proxy"
    fi
    sleep 2
done
log "Local extension proxy is ready"

if [[ -n "${EXT_PROXY_URL:-}" ]]; then
    log "Checking public tunnel $EXT_PROXY_URL/info ..."
    if curl -sf -o /dev/null "$EXT_PROXY_URL/info" 2>/dev/null; then
        log "Public tunnel sees the same proxy"
    else
        echo -e "${CYAN}[start-services] WARN:${NC} tunnel not reachable yet. Start cloudflared/ngrok to port 6674 and re-check."
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Services started${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}Next${NC}"
echo "  1) Ensure tunnel: cloudflared tunnel --url http://localhost:6674"
echo "  2) Set EXT_PROXY_URL in .env to that HTTPS URL"
echo "  3) curl -sf \"\$EXT_PROXY_URL/info\" | jq ."
echo "  4) ./scripts/post-build.sh"
echo ""
echo -e "${CYAN}Commands${NC}"
echo "  Logs:  docker compose logs -f"
echo "  Stop:  ./scripts/stop-services.sh"
