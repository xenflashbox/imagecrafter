#!/usr/bin/env bash
# Serial E2E cell driver.
#
# Replicate rate-limits parallel batches, so cells MUST run one at a time.
# Unlike the ad-hoc inline drivers this keeps stderr and surfaces ERROR/threw
# lines, so a crashed cell is visible instead of looking like a short cell.
#
# Usage: e2e-batch.sh <runs> <subject:pack:variant> [<subject:pack:variant> ...]
set -uo pipefail

RUNS="$1"; shift
for cell in "$@"; do
  IFS=':' read -r subject pack variant <<< "$cell"
  echo "########## ${subject} x ${pack}/${variant} ##########"
  npx tsx scripts/smoke/e2e-generate.ts "$subject" "$pack" "$variant" "$RUNS" 2>&1 \
    | grep -E "run [0-9]+/|preview: |error: |db says|threw: |passed the full|SMOKE FAILED"
  echo "  (cell exit: ${PIPESTATUS[0]})"
done
