#!/usr/bin/env bash
set -euo pipefail

FORCE="${1:-}"

fail(){ echo "ERROR: $*" >&2; exit 1; }
warn(){ echo "WARN: $*" >&2; }
ok(){ echo "OK: $*"; }

[[ -f "CRITICAL.md" ]] || fail "Missing CRITICAL.md"
[[ -f ".xenco/meta.json" ]] || fail "Missing .xenco/meta.json"
[[ -f ".vercel/project.json" ]] || fail "Missing .vercel/project.json"
[[ -d "scripts" ]] || fail "Missing scripts/"
ok "Core files present"

DEPLOY_TYPE="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d.get("deploy",{}).get("type","none"))
PY
)"

[[ "${DEPLOY_TYPE}" == "vercel" ]] || fail "deploy.type=${DEPLOY_TYPE}; expected vercel"
ok "Deploy type: ${DEPLOY_TYPE}"

EXPECTED_ROOT="$(python3 - <<'PY'
import json
d=json.load(open(".xenco/meta.json"))
print(d.get("workspace",{}).get("expected_repo_root",""))
PY
)"

if [[ -n "${EXPECTED_ROOT}" ]]; then
  ACTUAL="$(pwd)"
  [[ "${ACTUAL}" == "${EXPECTED_ROOT}" ]] || \
    fail "Wrong directory. expected_repo_root=${EXPECTED_ROOT} actual=${ACTUAL}"
  ok "Directory correct: ${ACTUAL}"
fi

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Not a git repo"
ROOT="$(git rev-parse --show-toplevel)"
[[ "${ROOT}" == "$(pwd)" ]] || fail "Not at git root. cd to: ${ROOT}"
ok "At git root"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${BRANCH}" != "main" && "${FORCE}" != "--force" ]]; then
  fail "Not on main branch (${BRANCH}). Switch to main or use --force."
fi
ok "Branch: ${BRANCH}"

CHANGES="$(git status --porcelain)"
if [[ -n "${CHANGES}" && "${FORCE}" != "--force" ]]; then
  echo "${CHANGES}" >&2
  fail "Uncommitted changes. Commit/stash first or use --force."
fi
[[ -z "${CHANGES}" ]] && ok "Git working tree clean" || warn "Git dirty (--force override active)"

git fetch origin main >/dev/null 2>&1 && ok "Fetched origin/main" || warn "Could not fetch origin/main"
command -v vercel >/dev/null 2>&1 || fail "Vercel CLI not found"
ok "Vercel CLI present"

ok "Preflight passed."
