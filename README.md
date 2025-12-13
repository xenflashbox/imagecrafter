# ImageCrafter

AI Image Generation Made Simple. Turn simple descriptions into stunning images without learning complex prompts.

![ImageCrafter](https://picsum.photos/seed/imagecrafter/1200/600)

## Features

- **Smart Prompt Enhancement** - Describe what you want in plain English. Our AI transforms it into optimized Gemini prompts.
- **Template Library** - Pre-built templates for blog headers, social media, presentations, children's books, and more.
- **Character Consistency** - Create projects with anchor images to maintain consistent characters across multiple generations.
- **Batch Generation** - Generate up to 10 images at once.
- **Prompt History** - Save, reuse, and edit your favorite prompts.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon PostgreSQL with Prisma ORM
- **Auth**: Clerk
- **Payments**: Stripe
- **Image Generation**: Gemini via custom API (image-gen.xencolabs.com)
- **Prompt Enhancement**: Claude Sonnet via Anthropic API
- **Styling**: Tailwind CSS + Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database (Neon recommended)
- Clerk account
- Stripe account
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/xenco-labs/imagecrafter.git
cd imagecrafter
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Fill in your environment variables in `.env.local`

5. Set up the database:
```bash
pnpm db:push
pnpm db:seed
```

6. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
imagecrafter/
├── app/
│   ├── (dashboard)/           # Authenticated dashboard pages
│   │   ├── generate/          # Main image generation
│   │   ├── gallery/           # Image gallery
│   │   ├── projects/          # Project management
│   │   ├── history/           # Prompt history
│   │   └── settings/          # Account settings
│   ├── (marketing)/           # Public marketing pages
│   ├── api/
│   │   ├── images/            # Image generation endpoints
│   │   └── webhooks/          # Stripe & Clerk webhooks
│   └── layout.tsx             # Root layout
├── lib/
│   └── services/
│       ├── image-generation.ts    # Image gen service
│       └── prompt-enhancement.ts  # AI prompt enhancement
├── prisma/
│   └── schema.prisma          # Database schema
└── public/
```

## Environment Variables

See `.env.example` for all required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk authentication |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `IMAGE_GEN_API_KEY` | Your Gemini image gen API |
| `ANTHROPIC_API_KEY` | Claude for prompt enhancement |

## Deployment

### Docker Swarm (Recommended)

1. Build the image:
```bash
docker build -t imagecrafter:latest .
```

2. Deploy to swarm:
```bash
docker stack deploy -c docker-compose.yml imagecrafter
```

### Vercel

```bash
vercel deploy
```

## Webhooks Setup

### Clerk Webhook
1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://imagecrafter.app/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`

### Stripe Webhook
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://imagecrafter.app/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

## Pricing Plans

| Plan | Price | Images | Features |
|------|-------|--------|----------|
| Free | $0 | 5/mo | Watermarked, 1K, basic templates |
| Starter | $9/mo | 100 | No watermark, 2K, batch mode |
| Pro | $19/mo | 500 | 4K, projects, character consistency |
| Team | $49/mo | 2,000 | API access, multiple seats |

## License

Proprietary - Xenco Labs

## Support

- Documentation: [docs.imagecrafter.app](https://docs.imagecrafter.app)
- Email: support@xencolabs.com
