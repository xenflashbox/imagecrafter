#!/usr/bin/env bash
# Guardrails-wrapped deploy entrypoint for ImageCrafter.
# Runs preflight then delegates to the full deploy-imagecrafter.sh script.
set -euo pipefail

FORCE="${1:-}"
TAG="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

# ── Preflight ─────────────────────────────────────────────────────────────────
./scripts/preflight.sh "${FORCE}"

# ── Read meta ─────────────────────────────────────────────────────────────────
DEPLOY_TYPE="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d.get("deploy",{}).get("type","none"))
PY
)"

if [[ "${DEPLOY_TYPE}" == "none" ]]; then
  echo "ℹ️  deploy.type=none. This repo is not deployable. Exiting."
  exit 0
fi

IMAGE="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d["deploy"]["docker_image"])
PY
)"

SERVICE="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d["deploy"]["swarm_service"])
PY
)"

echo ""
echo "🚀 Deploying ImageCrafter"
echo "   image:   ${IMAGE}"
echo "   service: ${SERVICE}"
echo ""

# ── Delegate to the full deploy script ───────────────────────────────────────
if [[ -x "./deploy-imagecrafter.sh" ]]; then
  if [[ -n "${TAG}" ]]; then
    ./deploy-imagecrafter.sh "${TAG}"
  else
    ./deploy-imagecrafter.sh
  fi
else
  echo "❌ deploy-imagecrafter.sh not found or not executable." >&2
  exit 1
fi

# ── Post-deploy verify ────────────────────────────────────────────────────────
echo ""
echo "Running post-deploy verification..."
./scripts/verify.sh || true

echo "✅ Deploy done."
