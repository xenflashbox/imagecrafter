#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m'

REGISTRY="registry.xencolabs.com"
IMAGE_REPO="blogcraft-c1sdk"
STACK_NAME="blogcraft-c1"
SERVICE_NAME="blogcraft-c1-frontend"
SERVICE_FQDN="${STACK_NAME}_${SERVICE_NAME}"

log() { echo -e "${BLUE}[deploy]${NC} $1"; }
ok()  { echo -e "${GREEN}[ok]${NC} $1"; }
warn(){ echo -e "${YELLOW}[warn]${NC} $1"; }
err() { echo -e "${RED}[error]${NC} $1" >&2; }

usage() {
  cat <<'EOF'
deploy-blogcraft.sh [version] [--no-cache] [--skip-push] [--skip-deploy]

version      Optional tag (defaults to vYYYYMMDD-HHMMSS)
--no-cache   Build image without using Docker cache
--skip-push  Skip pushing tags to registry
--skip-deploy  Skip docker service update
EOF
}

if [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

VERSION=""
NO_CACHE=false
SKIP_PUSH=false
SKIP_DEPLOY=false

if [[ $# -gt 0 && "$1" != --* ]]; then
  VERSION="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache) NO_CACHE=true ;;
    --skip-push) SKIP_PUSH=true ;;
    --skip-deploy) SKIP_DEPLOY=true ;;
    --help) usage; exit 0 ;;
    *) err "Unknown flag: $1"; usage; exit 1 ;;
  esac
  shift
done

if [[ -z "$VERSION" ]]; then
  VERSION="v$(date +%Y%m%d-%H%M%S)"
fi

IMAGE_TAG="${REGISTRY}/${IMAGE_REPO}:${VERSION}"
LATEST_TAG="${REGISTRY}/${IMAGE_REPO}:latest"

log "Using version ${GREEN}${VERSION}${NC}"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    log "Loading env vars from $file"
    set -o allexport
    # shellcheck disable=SC1090
    source "$file"
    set +o allexport
  fi
}

load_env_file ".env"
load_env_file ".env.production"

# Backwards compatibility: allow legacy NEXT_PUBLIC_BLOGCRAFT_WS_URL
if [[ -z "${NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_URL:-}" && -n "${NEXT_PUBLIC_BLOGCRAFT_WS_URL:-}" ]]; then
  export NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_URL="${NEXT_PUBLIC_BLOGCRAFT_WS_URL}"
fi

require_env() {
  local name="$1"
  local default="${2-}"
  local value="${!name:-$default}"
  if [[ -z "$value" ]]; then
    err "Missing required env: $name"
    exit 1
  fi
  printf '%s' "$value"
}

optional_env() {
  local name="$1"
  local default="${2-}"
  local value="${!name:-$default}"
  if [[ -z "$value" ]]; then
    warn "Optional env ${name} not set; using empty string"
  fi
  printf '%s' "$value"
}

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$(require_env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)"
NEXT_PUBLIC_CLERK_IS_SATELLITE="$(require_env NEXT_PUBLIC_CLERK_IS_SATELLITE true)"
NEXT_PUBLIC_CLERK_DOMAIN="$(require_env NEXT_PUBLIC_CLERK_DOMAIN)"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="$(require_env NEXT_PUBLIC_CLERK_SIGN_IN_URL https://xencolabs.com/sign-in)"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="$(require_env NEXT_PUBLIC_CLERK_SIGN_UP_URL https://xencolabs.com/sign-up)"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$(optional_env NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)"
NEXT_PUBLIC_C1_API_KEY="$(optional_env NEXT_PUBLIC_C1_API_KEY)"
NEXT_PUBLIC_APP_URL="$(require_env NEXT_PUBLIC_APP_URL https://blogcraft.app)"
DATABASE_URL="$(require_env DATABASE_URL)"
NEXT_PUBLIC_BLOGCRAFT_API_URL="$(require_env NEXT_PUBLIC_BLOGCRAFT_API_URL)"
NEXT_PUBLIC_BLOGCRAFT_API_KEY="${NEXT_PUBLIC_BLOGCRAFT_API_KEY:-}"
NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_URL="$(require_env NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_URL)"
NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_FALLBACK="${NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_FALLBACK:-}"
BLOGCRAFT_ENGINE_API_URL="$(require_env BLOGCRAFT_ENGINE_API_URL https://engine.blogcraft.app)"
BLOGCRAFT_ENGINE_API_KEY="$(require_env BLOGCRAFT_ENGINE_API_KEY dummy-build-key)"

mask() {
  local value="$1"
  local len=${#value}
  if (( len <= 4 )); then
    printf '****'
    return
  fi
  printf '%s***%s' "${value:0:4}" "${value: -2}"
}

log "Clerk publishable key: $(mask "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")"
log "BlogCraft API key: $(mask "$NEXT_PUBLIC_BLOGCRAFT_API_KEY")"

log "Cleaning previous Next.js build artifacts"
rm -rf .next/

BUILD_ARGS=(
  "--build-arg" "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}"
  "--build-arg" "NEXT_PUBLIC_CLERK_IS_SATELLITE=${NEXT_PUBLIC_CLERK_IS_SATELLITE}"
  "--build-arg" "NEXT_PUBLIC_CLERK_DOMAIN=${NEXT_PUBLIC_CLERK_DOMAIN}"
  "--build-arg" "NEXT_PUBLIC_CLERK_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_URL}"
  "--build-arg" "NEXT_PUBLIC_CLERK_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_URL}"
  "--build-arg" "STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}"
  "--build-arg" "NEXT_PUBLIC_C1_API_KEY=${NEXT_PUBLIC_C1_API_KEY}"
  "--build-arg" "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}"
  "--build-arg" "DATABASE_URL=${DATABASE_URL}"
  "--build-arg" "NEXT_PUBLIC_BLOGCRAFT_API_URL=${NEXT_PUBLIC_BLOGCRAFT_API_URL}"
  "--build-arg" "NEXT_PUBLIC_BLOGCRAFT_API_KEY=${NEXT_PUBLIC_BLOGCRAFT_API_KEY}"
  "--build-arg" "NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_URL=${NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_URL}"
  "--build-arg" "NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_FALLBACK=${NEXT_PUBLIC_BLOGCRAFT_WEBSOCKET_FALLBACK}"
  "--build-arg" "BLOGCRAFT_ENGINE_API_URL=${BLOGCRAFT_ENGINE_API_URL}"
  "--build-arg" "BLOGCRAFT_ENGINE_API_KEY=${BLOGCRAFT_ENGINE_API_KEY}"
)

log "Building Docker image ${IMAGE_TAG}"
BUILD_CMD=(docker build -t "${IMAGE_TAG}" -t "${LATEST_TAG}")
if [[ "$NO_CACHE" == true ]]; then
  BUILD_CMD+=("--no-cache")
fi
BUILD_CMD+=("${BUILD_ARGS[@]}" .)

"${BUILD_CMD[@]}"
ok "Image built"

if [[ "$SKIP_PUSH" == false ]]; then
  log "Pushing ${IMAGE_TAG}"
  docker push "${IMAGE_TAG}"
  log "Pushing ${LATEST_TAG}"
  docker push "${LATEST_TAG}"
  ok "Images pushed to ${REGISTRY}"
else
  warn "Skipping image push"
fi

if [[ "$SKIP_DEPLOY" == false ]]; then
  if [[ "$SKIP_PUSH" == true ]]; then
    warn "Deploy requested without pushing image. Continuing..."
  fi
  log "Updating Docker service ${SERVICE_FQDN}"
  docker service update --image "${IMAGE_TAG}" "${SERVICE_FQDN}"
  ok "Service updated. Run 'docker service ps ${SERVICE_FQDN}' to monitor rollout."
else
  warn "Skipping deployment step"
  log "Deploy manually with: docker service update --image ${IMAGE_TAG} ${SERVICE_FQDN}"
fi

ok "Done. Current version tag: ${VERSION}"

