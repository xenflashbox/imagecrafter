#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

echo "🔍 Verifying ImageCrafter deployment..."
echo ""

# ── HTTP health checks ────────────────────────────────────────────────────────
python3 - <<'PY'
import json, urllib.request, sys

d = json.load(open(".xenco/meta.json"))
dep = d.get("deploy", {})
all_ok = True

for key in ("health_url", "version_url"):
    url = dep.get(key)
    if not url:
        print(f"⚠️  Missing {key} in .xenco/meta.json")
        continue
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            status = r.status
            body = r.read(2000).decode("utf-8", "ignore")
        if status == 200:
            print(f"✅ {key}: HTTP {status} — {url}")
            if key == "version_url" and body:
                print(f"   {body[:300].strip()}")
        else:
            print(f"⚠️  {key}: HTTP {status} — {url}")
    except Exception as e:
        print(f"❌ {key} failed: {url} → {e}")
        all_ok = False

sys.exit(0 if all_ok else 1)
PY

# ── Swarm service status ──────────────────────────────────────────────────────
echo ""
SERVICE="$(python3 -c "import json; d=json.load(open('.xenco/meta.json')); print(d['deploy']['swarm_service'])")"
echo "🐳 Swarm service: ${SERVICE}"
docker service ps "${SERVICE}" \
  --filter desired-state=running \
  --format "  replica {{.Name}}: {{.Node}} — {{.CurrentState}}" \
  2>/dev/null || echo "  (could not query swarm service — ensure you are on a manager node)"

echo ""
echo "✅ Verification complete."
