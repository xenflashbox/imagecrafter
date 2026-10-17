#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

echo "Verifying ImageCrafter deployment..."
echo ""

fail(){ echo "ERROR: $*" >&2; FAILED=1; }
ok(){ echo "OK: $*"; }
FAILED=0

HEALTH_URL="$(python3 -c "import json; d=json.load(open('.xenco/meta.json')); print(d['deploy'].get('health_url',''))")"
VERSION_URL="$(python3 -c "import json; d=json.load(open('.xenco/meta.json')); print(d['deploy'].get('version_url',''))")"

check_url() {
  local label="$1"
  local url="$2"
  if [[ -z "$url" ]]; then
    echo "WARN: Missing ${label} in .xenco/meta.json"
    return
  fi

  HTTP_CODE="$(curl -s -o /tmp/imagecrafter_verify_body.txt -w "%{http_code}" --max-time 15 \
    -A "imagecrafter-healthcheck/1.0" "${url}" 2>/dev/null || echo "000")"

  if [[ "$HTTP_CODE" == "200" ]]; then
    ok "${label}: HTTP ${HTTP_CODE} - ${url}"
    if [[ "$label" == "version_url" ]]; then
      head -c 300 /tmp/imagecrafter_verify_body.txt | tr -d '\r'
      echo ""
    fi
  else
    fail "${label}: HTTP ${HTTP_CODE} - ${url}"
  fi
}

check_url "health_url" "${HEALTH_URL}"
check_url "version_url" "${VERSION_URL}"

echo ""
if [[ "$FAILED" -eq 0 ]]; then
  echo "Verification complete - all checks passed."
else
  echo "Verification complete - some checks failed."
  exit 1
fi
