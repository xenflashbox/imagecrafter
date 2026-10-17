#!/usr/bin/env bash
# Guardrails-wrapped Vercel deploy entrypoint for ImageCrafter.
set -euo pipefail

FORCE="${1:-}"
TAG="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

./scripts/preflight.sh "${FORCE}"

DEPLOY_TYPE="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d.get("deploy",{}).get("type","none"))
PY
)"

if [[ "${DEPLOY_TYPE}" != "vercel" ]]; then
  echo "deploy.type=${DEPLOY_TYPE}; expected vercel." >&2
  exit 1
fi

PROJECT="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d["deploy"].get("project_name","imagecrafter"))
PY
)"

if [[ -z "${VERCEL_ORG_ID:-}" && -f ".vercel/project.json" ]]; then
  export VERCEL_ORG_ID="$(python3 - <<'PY'
import json
d=json.load(open(".vercel/project.json"))
print(d.get("orgId",""))
PY
)"
fi

echo ""
echo "Deploying ImageCrafter"
echo "  target:  Vercel production"
echo "  project: ${PROJECT}"
echo ""

if [[ -n "${TAG}" ]]; then
  echo "Ignoring legacy tag argument '${TAG}'; Vercel deployments are identified by deployment URL/id."
fi

if [[ "${FORCE}" == "--force" ]]; then
  vercel deploy --prod --yes --force
else
  vercel deploy --prod --yes
fi

echo ""
echo "Running post-deploy verification..."
./scripts/verify.sh || true

echo "Deploy done."
