#!/usr/bin/env bash
set -euo pipefail

echo "PWD: $(pwd)"
echo "HOST: $(hostname)"

echo "IP(s):"
ip -4 addr show | awk '/inet /{print " - " $2 " (" $NF ")"}' || true

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "GIT_ROOT: $(git rev-parse --show-toplevel)"
  echo "BRANCH:   $(git rev-parse --abbrev-ref HEAD)"
  echo "SHA:      $(git rev-parse --short HEAD)"
  echo "REMOTE:   $(git remote get-url origin 2>/dev/null || echo '(no remote)')"
else
  echo "GIT_ROOT: (not a git repo)"
fi

if [[ -f ".xenco/meta.json" ]]; then
  echo "META:"
  python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print("  kind:         ", d.get("kind"))
print("  service_id:   ", d.get("service_id"))
print("  repo_id:      ", d.get("repo_id"))
print("  deploy.type:  ", d.get("deploy",{}).get("type"))
print("  manager_host: ", d.get("deploy",{}).get("manager_host"))
print("  docker_image: ", d.get("deploy",{}).get("docker_image"))
print("  swarm_service:", d.get("deploy",{}).get("swarm_service"))
print("  health_url:   ", d.get("deploy",{}).get("health_url"))
PY
else
  echo "META: (missing .xenco/meta.json)"
fi

if command -v docker >/dev/null 2>&1; then
  echo ""
  echo "SWARM NODE STATUS:"
  docker node ls 2>/dev/null | head -8 || echo "  (not a swarm manager or docker unavailable)"
  echo ""
  echo "SERVICE STATUS:"
  SERVICE="$(python3 -c "import json; d=json.load(open('.xenco/meta.json')); print(d['deploy']['swarm_service'])" 2>/dev/null || echo '')"
  if [[ -n "$SERVICE" ]]; then
    docker service ps "$SERVICE" --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}" 2>/dev/null | head -6 || echo "  (service not found or not on manager)"
  fi
fi
