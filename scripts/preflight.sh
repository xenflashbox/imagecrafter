#!/usr/bin/env bash
set -euo pipefail

FORCE="${1:-}"

fail(){ echo "❌ $*" >&2; exit 1; }
warn(){ echo "⚠️  $*" >&2; }
ok(){ echo "✅ $*"; }

# ── Core file checks ──────────────────────────────────────────────────────────
[[ -f "CRITICAL.md" ]]      || fail "Missing CRITICAL.md"
[[ -f ".xenco/meta.json" ]] || fail "Missing .xenco/meta.json"
[[ -d "scripts" ]]          || fail "Missing scripts/"
[[ -f "Dockerfile" ]]       || fail "Missing Dockerfile"
[[ -f "docker-compose.yml" ]] || fail "Missing docker-compose.yml"
ok "Core files present"

# ── Read meta ─────────────────────────────────────────────────────────────────
DEPLOY_TYPE="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d.get("deploy",{}).get("type","none"))
PY
)"

EXPECTED_ROOT="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d.get("workspace",{}).get("expected_repo_root",""))
PY
)"

MANAGER="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d.get("deploy",{}).get("manager_host",""))
PY
)"

# ── Directory guard ────────────────────────────────────────────────────────────
if [[ -n "${EXPECTED_ROOT}" ]]; then
  ACTUAL="$(pwd)"
  [[ "${ACTUAL}" == "${EXPECTED_ROOT}" ]] || \
    fail "Wrong directory. expected_repo_root=${EXPECTED_ROOT} actual=${ACTUAL}"
  ok "Directory correct: ${ACTUAL}"
fi

# ── Subnet guard ──────────────────────────────────────────────────────────────
if [[ -n "${MANAGER}" && "${MANAGER}" == 192.168.* ]]; then
  fail "manager_host is 192.168.* (wrong subnet). Fix .xenco/meta.json"
fi
[[ -n "${MANAGER}" ]] && ok "manager_host OK: ${MANAGER}"

# ── Git + branch guards (deployable repos only) ───────────────────────────────
if [[ "${DEPLOY_TYPE}" != "none" ]]; then
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || \
    fail "deploy.type=${DEPLOY_TYPE} but not a git repo."

  ROOT="$(git rev-parse --show-toplevel)"
  [[ "${ROOT}" == "$(pwd)" ]] || \
    fail "Not at git root. cd to: ${ROOT}"
  ok "At git root"

  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "${BRANCH}" != "main" && "${FORCE}" != "--force" ]]; then
    fail "Not on main branch (${BRANCH}). Switch to main (or --force emergency)."
  fi
  ok "Branch: ${BRANCH}"

  CHANGES="$(git status --porcelain)"
  if [[ -n "${CHANGES}" && "${FORCE}" != "--force" ]]; then
    echo "${CHANGES}" >&2
    fail "Uncommitted changes. Commit/stash first (or --force for emergency)."
  fi
  [[ -z "${CHANGES}" ]] && ok "Git working tree clean" || warn "Git dirty (--force override active)"

  git fetch origin main >/dev/null 2>&1 && ok "Fetched origin/main" || warn "Could not fetch origin/main"
fi

# ── env file check ────────────────────────────────────────────────────────────
[[ -f ".env" ]] && ok ".env file present" || warn ".env file missing — ensure env vars are set externally"

ok "Preflight passed."
