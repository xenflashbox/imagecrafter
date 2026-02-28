# Ops — ImageCrafter

> **Always read `CRITICAL.md` before any infrastructure action.**

## Quick Reference

| Action | Command |
|--------|---------|
| Identify repo & service | `./scripts/whoami.sh` |
| Preflight checks | `./scripts/preflight.sh` |
| Deploy (build → push → update) | `./scripts/deploy.sh` |
| Emergency deploy (dirty tree) | `./scripts/deploy.sh --force` |
| Verify health | `./scripts/verify.sh` |
| Full deploy with tag | `./deploy-imagecrafter.sh v20260228-120000` |

## Deployment Flow

```
./scripts/deploy.sh
  └── ./scripts/preflight.sh   ← hard blocks on: wrong dir, dirty git, wrong branch, bad subnet
  └── ./deploy-imagecrafter.sh ← builds Docker image with build args, pushes, swarm update
  └── ./scripts/verify.sh      ← checks health_url + version_url + swarm replica status
```

## Stack Info

- **App URL**: https://imagecrafter.app
- **Swarm service**: `imagecrafter_imagecrafter` (2 replicas)
- **Docker image**: `registry.xencolabs.com/imagecrafter`
- **Swarm manager**: 10.8.8.15 (xenco3 — Leader)
- **Database**: Shared Blogcraft Neon PostgreSQL (`ic_` prefix)

## Health Endpoints

- `GET https://imagecrafter.app` — homepage (HTTP 200 = live)
- `GET https://imagecrafter.app/api/health` — JSON health + version

## Key Files

| File | Purpose |
|------|---------|
| `CRITICAL.md` | Network, nodes, DB rules — read first |
| `.xenco/meta.json` | Machine-readable service identity + deploy config |
| `scripts/whoami.sh` | Orientation: pwd, git, meta, swarm status |
| `scripts/preflight.sh` | Hard blocks before deploy |
| `scripts/deploy.sh` | Guardrails-wrapped deploy entrypoint |
| `scripts/verify.sh` | Post-deploy health verification |
| `deploy-imagecrafter.sh` | Full deploy script (build args, push, service update) |
| `docker-compose.yml` | Swarm stack definition |
| `Dockerfile` | Multi-stage Next.js build |
| `prisma/schema.prisma` | Database schema (`@@map("ic_*")` prefixes) |

## Emergency Procedure

1. `./scripts/whoami.sh` — confirm you are in the right place
2. `git diff --stat && git rev-parse HEAD` — capture current state
3. `./scripts/deploy.sh --force` — deploy without clean-tree check
4. **Document**: paste reason + diff + SHA into incident log
