# ED Clinical Guidelines

An Emergency Department clinical guidelines application with AI-powered search. Clinicians can browse, search, and query uploaded local guidelines using a RAG-based AI agent with keyword fallback, plus optional external NICE/RCEM web search.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19, TanStack Start, TanStack Router (file-based) |
| **Backend** | Convex (real-time database, server functions, file storage) |
| **AI / RAG** | `@convex-dev/rag` (vector embeddings), `@convex-dev/agent` (tool-calling agent) |
| **LLM** | Cerebras (`zai-glm-4.7`) for agent chat, OpenAI (`text-embedding-3-small`) for embeddings |
| **Auth** | Better Auth via `@convex-dev/better-auth` |
| **Styling** | Tailwind CSS v4, shadcn/ui (New York style) |
| **Deployment** | Cloudflare Workers (via Wrangler) |
| **Testing** | Vitest, Testing Library |

## Features

- **AI Agent Chat** — ask clinical questions in natural language; the agent searches guidelines and synthesises scenario-specific answers with source citations
- **Tiered Local Retrieval** — semantic vector search first, keyword full-text fallback second over uploaded local guidelines
- **External Web Search** — optional NICE/RCEM-constrained web results for non-local lookups
- **Document Upload & Indexing** — upload PDF guidelines; LLM extracts metadata, cleans OCR artefacts, classifies by category, and indexes into the RAG pipeline
- **Browse & Filter** — browse published guidelines by category with search
- **Version History & Audit Log** — full version tracking and compliance audit trail

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- A [Convex](https://convex.dev/) account (or self-hosted instance)
- An [OpenAI](https://platform.openai.com/) API key (for embeddings)
- A [Cerebras](https://cerebras.ai/) API key (for the agent LLM)

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

**Required variables:**

| Variable | Description |
|----------|-------------|
| `CONVEX_DEPLOYMENT` | Convex deployment identifier (e.g. `dev:your-project-name`) |
| `VITE_CONVEX_URL` | Convex API URL (`https://<deployment>.convex.cloud`) |
| `VITE_CONVEX_SITE_URL` | Convex HTTP actions URL (`https://<deployment>.convex.site`) |
| `VITE_SITE_URL` | Your app's public URL (e.g. `http://localhost:8000` for dev) |
| `BETTER_AUTH_SECRET` | Auth secret — generate with `openssl rand -base64 32` |

**Set in Convex dashboard** (or via CLI):

```bash
npx convex env set OPENAI_API_KEY=sk-...
npx convex env set BETTER_AUTH_SECRET=...
```

The Cerebras API key is also required for the agent LLM — set it as `CEREBRAS_API_KEY` in the Convex environment.

### 3. Set up Convex

```bash
npx convex dev
```

This starts the Convex dev server, pushes your schema, and syncs functions.

## Development

```bash
# Start the frontend dev server (port 8000)
pnpm dev

# In a separate terminal, start Convex dev
npx convex dev
```

### Available scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Vite dev server on port 8000 |
| `pnpm build` | Production build |
| `pnpm serve` | Preview production build locally |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |
| `pnpm test` | Run tests with Vitest |
| `pnpm cf-typegen` | Generate TypeScript types for Cloudflare env |
| `pnpm convex:dev` | Start Convex dev server |
| `pnpm convex:deploy` | Deploy Convex functions to production |

## Project Structure

```
src/
├── routes/              # TanStack Router file-based routes
│   ├── _authed/         # Authenticated routes (search, browse, admin)
│   └── __root.tsx       # Root layout
├── components/
│   ├── search/          # Agent chat, search bar, search results
│   ├── guidelines/      # Guideline cards and content display
│   ├── landing/         # Landing page sections
│   ├── layout/          # App shell
│   ├── navigation/      # Navigation bar
│   ├── theme/           # Theme provider and toggle
│   └── ui/              # shadcn/ui primitives
├── lib/                 # Utilities (auth client, PDF extraction, cn())
└── core/                # Server functions and middleware

convex/
├── guidelineAgent.ts    # AI agent with RAG + keyword search tools
├── rag.ts               # RAG component configuration
├── guidelines.ts        # Guideline CRUD, search queries
├── documents.ts         # Document upload, LLM processing, RAG indexing
├── searchAction.ts      # AI search action (fulltext fallback)
├── schema.ts            # Database schema
├── chat.ts              # Chat thread management
├── auth.ts / auth.config.ts  # Better Auth setup
└── auditLog.ts          # Audit logging
```

## Architecture: Search & RAG Pipeline

1. **User asks a question** via the agent chat interface
2. **Agent decides** which tools to call (up to 4 steps)
3. **`ragSearch` tool** — semantic vector search over embedded local guideline chunks
4. **`searchGuidelines` tool** — compact keyword fallback over local guidelines
5. **`searchExternalWeb` tool** — NICE/RCEM-constrained web search when needed
6. **Agent synthesises** a scenario-specific answer with source citations and guideline slugs for linking

Document ingestion:
1. PDF uploaded → text extracted client-side
2. LLM processes raw text → cleans OCR, extracts title/summary/category/tags
3. Cleaned content indexed into RAG vector store
4. Browsable guideline entry created in the database

## License

MIT
