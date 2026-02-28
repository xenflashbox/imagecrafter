# CRITICAL (READ FIRST)

## Service Identity
- **Service**: ImageCrafter — AI Image Generation SaaS
- **URL**: https://imagecrafter.app
- **Registry image**: `registry.xencolabs.com/imagecrafter`
- **Swarm service**: `imagecrafter_imagecrafter`
- **Stack**: `imagecrafter`

## Network (authoritative)
- Cluster subnet: 10.8.8.0/24
- NEVER use 192.168.x.x in this environment.

## Swarm nodes (authoritative quick ref)
- Managers: 10.8.8.15 (xenco3 — Leader), 10.8.8.14 (xenco2 — Reachable), 10.8.8.17 (xenco5 — Reachable)
- Workers:  10.8.8.12 (xenco), 10.8.8.16 (xenco4), 10.8.8.108 (xenco6), 10.8.8.13 (xenco1)

## Database (authoritative)
- **Provider**: Shared Blogcraft Neon PostgreSQL
- **Table prefix**: `ic_`
- **Tables**: ic_User, ic_Subscription, ic_Image, ic_Template, ic_TemplatePreset, ic_Project, ic_CharacterProfile, ic_PromptHistory, ic_UsageRecord, ic_BatchJob, ic_Review, ic_WaitlistEntry
- Do NOT write to tables without the `ic_` prefix — those belong to other services.

## Absolute rule: no guessing
Before ANY infra action:
1. ./scripts/whoami.sh
2. ./scripts/preflight.sh

## Deployment rule
- Only deploy using: `./deploy-imagecrafter.sh` (full build + push + swarm update)
- OR use the guardrails wrapper: `./scripts/deploy.sh` (delegates to deploy-imagecrafter.sh)
- Deploy BLOCKS if git is dirty unless you pass --force

## Emergency only
- `./scripts/deploy.sh --force`
- If used, you MUST paste: reason + `git diff --stat` + `git rev-parse HEAD`

## Key env vars (never hardcode — always from .env)
- DATABASE_URL — shared Blogcraft Neon (ic_ prefix)
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY
- STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
- IMAGE_GEN_API_URL / IMAGE_GEN_API_KEY
- AI_GATEWAY_URL / AI_GATEWAY_API_KEY / AI_MODEL
