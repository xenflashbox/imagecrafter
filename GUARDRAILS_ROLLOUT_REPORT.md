# Guardrails Kit v1 — Rollout Report

**Generated**: 2026-02-28  
**Operator**: AI agent (Cursor)  
**Kit version**: v1

---

## Summary

| Field | Value |
|-------|-------|
| Directory | `/home/xen/docker/apps/imagecrafter` |
| Kind | `service` |
| Deploy type | `swarm` |
| Git remote | `https://github.com/xenflashbox/imagecrafter.git` |
| Git branch | `main` |
| Final SHA | `e9de2d5` |
| Docker image | `registry.xencolabs.com/imagecrafter` |
| Swarm service | `imagecrafter_imagecrafter` |
| Swarm manager | `10.8.8.15` (xenco3 — Leader) |
| Status | **completed** |

---

## Files Installed

| File | Status | Notes |
|------|--------|-------|
| `CRITICAL.md` | ✅ Created | Network rules, swarm nodes, DB constraints, deploy procedures |
| `.xenco/meta.json` | ✅ Created | Service identity, deploy config, expected_repo_root guard |
| `scripts/whoami.sh` | ✅ Created | Orientation: pwd, git state, meta, swarm node & replica status |
| `scripts/preflight.sh` | ✅ Created | Hard blocks: dir guard, subnet guard, git/branch/dirty checks, env check |
| `scripts/deploy.sh` | ✅ Created | Guardrails wrapper → delegates to `deploy-imagecrafter.sh` |
| `scripts/verify.sh` | ✅ Created | curl-based health + version URL checks + swarm replica status |
| `README-OPS.md` | ✅ Created | Ops quick reference table and flow diagram |
| `app/api/health/route.ts` | ✅ Created | `GET /api/health` → `{"status":"ok","service":"imagecrafter","version":"0.1.0"}` |

---

## Guardrail Checks Verified

| Check | Result |
|-------|--------|
| `scripts/whoami.sh` execution | ✅ Pass — correct pwd, git root, meta parsed |
| `scripts/preflight.sh` on dirty tree | ✅ Correctly blocks with ❌ |
| `scripts/preflight.sh` on clean tree | ✅ All 8 checks pass |
| `expected_repo_root` guard | ✅ Blocks if wrong directory |
| `manager_host` subnet guard | ✅ Blocks on 192.168.x.x, passes on 10.8.8.15 |
| Git branch guard | ✅ Blocks if not on `main` |
| Git dirty guard | ✅ Blocks on uncommitted changes |

---

## Health Verification (Post-Deploy)

| Endpoint | HTTP | Response |
|----------|------|----------|
| `health_url` — `https://imagecrafter.app` | ✅ 200 | Homepage HTML (Next.js 15) |
| `version_url` — `https://imagecrafter.app/api/health` | ✅ 200 | `{"status":"ok","service":"imagecrafter","version":"0.1.0","timestamp":"..."}` |

**Swarm replicas (stable)**:
- `imagecrafter_imagecrafter.1` → xenco1 — Running
- `imagecrafter_imagecrafter.2` → xenco4 — Running

---

## Fixes Applied During Rollout

1. **Prisma client regeneration** — `pnpm prisma generate` was required after `@@map` directives were added to schema (previous session had not regenerated).
2. **Docker build args** — Dockerfile requires `--build-arg` for Clerk + DB credentials; updated `deploy-imagecrafter.sh` to supply them.
3. **Clerk middleware** — `/api/health` was blocked by auth middleware; added to public routes in `middleware.ts`.
4. **verify.sh UA** — Cloudflare blocks Python `urllib` default UA; switched to `curl -A "imagecrafter-healthcheck/1.0"`.

---

## Commit History (This Session)

| SHA | Message |
|-----|---------|
| `0ef9c5d` | feat: migrate database to shared Blogcraft Neon DB with ic_ prefix |
| `95e1562` | feat(ops): add guardrails kit v1 |
| `be190c5` | fix(ops): expose /api/health publicly and use curl in verify.sh |

---

## Drift Protection

The guardrail system prevents the following classes of drift:

- **Wrong directory** — `preflight.sh` hard-blocks if `pwd != expected_repo_root`
- **Wrong subnet** — blocks `192.168.x.x` as manager host
- **Dirty deploys** — blocks uncommitted changes (unless `--force`)
- **Wrong branch** — blocks deploys from non-`main` branches
- **Agent disorientation** — `whoami.sh` gives immediate orientation before any action
- **Undocumented deploys** — all deploys go through `scripts/deploy.sh` which calls `scripts/verify.sh` after
