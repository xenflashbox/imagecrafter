# CRITICAL (READ FIRST)

## Service Identity
- **Service**: ImageCrafter — AI Image Generation SaaS
- **URL**: https://imagecrafter.app
- **Hosting**: Vercel project `imagecrafter`

## Deployment (authoritative)
- The frontend runs on Vercel.
- Do not deploy the frontend with Docker, Docker Swarm, Traefik, NFS volumes, or registry images.
- Use `./scripts/deploy.sh` for production deploys.

## Database (authoritative)
- **Provider**: Shared Blogcraft Neon PostgreSQL
- **Table prefix**: `ic_`
- **Tables**: ic_User, ic_Subscription, ic_Image, ic_Template, ic_TemplatePreset, ic_Project, ic_CharacterProfile, ic_PromptHistory, ic_UsageRecord, ic_BatchJob, ic_Review, ic_WaitlistEntry
- Do NOT write to tables without the `ic_` prefix — those belong to other services.

## Absolute rule: no guessing
Before ANY deployment action:
1. ./scripts/whoami.sh
2. ./scripts/preflight.sh

## Deployment rule
- Only deploy the frontend using the guardrails wrapper: `./scripts/deploy.sh`
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
