# ED Clinical Guidelines

A web application for searching, browsing, and managing emergency department clinical guidelines. Features an AI agent with RAG-based semantic search and a tiered search strategy (semantic vector search → full-text keyword fallback) with source priority (local → RCEM → NICE).

Key capabilities:

- **AI-powered search** — RAG semantic search (1536-dim vectors) with full-text keyword fallback
- **Document ingestion pipeline** — PDF upload → client-side extraction → LLM processing (Cerebras) → guideline creation + vector indexing
- **Role-based access** — Admin document management and guideline CRUD
- **Real-time data** — Powered by Convex for live updates across clients

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TanStack Start + Router + Query, Tailwind CSS v4, Shadcn/UI (new-york style) |
| **Backend** | Convex (real-time database, serverless functions) |
| **AI / LLM** | Cerebras (`zai-glm-4.7` via `@ai-sdk/cerebras`), OpenAI (`text-embedding-3-small` for embeddings) |
| **RAG** | `@convex-dev/rag` (1536-dim vectors), `@convex-dev/agent` |
| **Auth** | Better Auth via `@convex-dev/better-auth` |
| **Deployment** | Cloudflare Workers (SSR via `@cloudflare/vite-plugin`) |
| **PDF Processing** | `pdfjs-dist` (client-side extraction) |
| **Package Manager** | pnpm |

## Prerequisites

- Node.js 18+
- pnpm
- Convex account (or self-hosted Convex instance)
- OpenAI API key (for embeddings)
- Cerebras API key (for LLM agent)
- Cloudflare account (for deployment)

## Environment Variables

### Local Development (`.env`)

| Variable | Description |
|---|---|
| `CONVEX_DEPLOYMENT` | Convex deployment identifier (e.g. `dev:your-project-name`) |
| `VITE_CONVEX_URL` | Convex API URL (`https://your-deployment.convex.cloud`) |
| `VITE_CONVEX_SITE_URL` | Convex HTTP actions URL (`https://your-deployment.convex.site`) |
| `VITE_SITE_URL` | Frontend URL (e.g. `http://localhost:8000`) |

### Convex Dashboard Environment Variables

| Variable | Description |
|---|---|
| `BETTER_AUTH_SECRET` | Auth secret — generate with `openssl rand -base64 32` |
| `OPENAI_API_KEY` | OpenAI API key for text-embedding-3-small |
| `CEREBRAS_API_KEY` | Cerebras API key for the AI agent |

### Self-Hosted Convex (optional, see `.env.example-local`)

| Variable | Description |
|---|---|
| `BETTER_AUTH_URL` | BetterAuth frontend URL |
| `CONVEX_SELF_HOSTED_URL` | Self-hosted Convex API base |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Self-hosted admin key |

### Cloudflare (`wrangler.jsonc`)

- R2 Bucket binding: `DOCUMENTS_BUCKET` → `ed-guidelines-docs`

## Setup

```bash
# Clone the repository
git clone <repo-url>
cd <repo-name>

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Set up Convex
npx convex dev
# Set environment variables in Convex dashboard
```

## Development

```bash
# Start Convex dev server (in one terminal)
pnpm convex:dev

# Start the app (in another terminal)
pnpm dev
# App runs at http://localhost:8000
```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start dev server on port 8000 |
| `pnpm build` | Production build |
| `pnpm preview` | Build + preview |
| `pnpm deploy` | Build + deploy to Cloudflare Workers |
| `pnpm test` | Run tests with Vitest |
| `pnpm convex:dev` | Start Convex dev server |
| `pnpm convex:deploy` | Deploy Convex functions |

## Project Structure

```
convex/           Backend: schema, queries, mutations, actions, RAG config, AI agent
src/components/   React components (search, guidelines, navigation, UI)
src/routes/       TanStack Router file-based routes
src/lib/          Utilities (auth, PDF extraction, helpers)
docs/             Reference documentation for Convex agents
```

## Testing

```bash
pnpm test
```

Tests use Vitest with jsdom environment.

## Deployment

```bash
pnpm deploy
```

Deploys to Cloudflare Workers. Ensure `wrangler.jsonc` is configured with your account and R2 bucket.
