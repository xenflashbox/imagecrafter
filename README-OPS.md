# Ops — ImageCrafter

> **Always read `CRITICAL.md` before any infrastructure action.**

## Quick Reference

| Action | Command |
|--------|---------|
| Identify repo & service | `./scripts/whoami.sh` |
| Preflight checks | `./scripts/preflight.sh` |
| Deploy to production | `./scripts/deploy.sh` |
| Emergency deploy (dirty tree) | `./scripts/deploy.sh --force` |
| Verify health | `./scripts/verify.sh` |

## Deployment Flow

```
./scripts/deploy.sh
  └── ./scripts/preflight.sh   ← hard blocks on: wrong dir, dirty git, wrong branch
  └── vercel deploy --prod --yes
  └── ./scripts/verify.sh      ← checks health_url + version_url
```

## Stack Info

- **App URL**: https://imagecrafter.app
- **Hosting**: Vercel project `imagecrafter`
- **Database**: Shared Blogcraft Neon PostgreSQL (`ic_` prefix)

## Health Endpoints

- `GET https://imagecrafter.app` — homepage (HTTP 200 = live)
- `GET https://imagecrafter.app/api/health` — JSON health + version

## Key Files

| File | Purpose |
|------|---------|
| `CRITICAL.md` | Deployment and DB rules — read first |
| `.xenco/meta.json` | Machine-readable service identity + deploy config |
| `scripts/whoami.sh` | Orientation: pwd, git, meta, Vercel project |
| `scripts/preflight.sh` | Hard blocks before deploy |
| `scripts/deploy.sh` | Guardrails-wrapped Vercel deploy entrypoint |
| `scripts/verify.sh` | Post-deploy health verification |
| `prisma/schema.prisma` | Database schema (`@@map("ic_*")` prefixes) |

## Emergency Procedure

1. `./scripts/whoami.sh` — confirm you are in the right place
2. `git diff --stat && git rev-parse HEAD` — capture current state
3. `./scripts/deploy.sh --force` — deploy without clean-tree check
4. **Document**: paste reason + diff + SHA into incident log
