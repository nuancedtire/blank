# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` - Start TanStack Start dev server (port 3000)
- `npx convex dev` - Start Convex dev server (run in separate terminal)
- `pnpm build` - Build for production
- `pnpm deploy` - Build and deploy to Cloudflare Workers
- `pnpm test` - Run tests with Vitest
- `npx convex deploy` - Deploy Convex functions to production
- `pnpx shadcn@latest add <component>` - Add Shadcn components

## Architecture

ED Clinical Guidelines — an AI-powered guideline retrieval app for Emergency Department clinicians. TanStack Start frontend deployed on Cloudflare Workers, with Convex as the entire backend (database, server functions, file storage, auth, RAG, AI agent).

### Stack

- **Frontend**: React 19, TanStack Start (file-based routing + SSR), TanStack Query, Tailwind CSS v4
- **Backend**: Convex (real-time database, queries/mutations/actions, file storage)
- **AI/RAG**: `@convex-dev/rag` (vector embeddings via OpenAI `text-embedding-3-small`), `@convex-dev/agent` (tool-calling agent via Cerebras `zai-glm-4.7`)
- **Auth**: Better Auth via `@convex-dev/better-auth` (email/password + Microsoft SSO)
- **Deployment**: Cloudflare Workers (Wrangler), Convex Cloud
- **Styling**: Shadcn/ui (New York style, Zinc base, CSS variables), Lucide icons

### Data Flow

All server-side logic lives in `convex/`. The frontend never calls external APIs directly — everything goes through Convex functions.

**Client → Convex integration** is via `@convex-dev/react-query`:
- `convexQuery(api.module.fn, args)` for reactive queries (live-updating subscriptions, not polling)
- `useConvexMutation(api.module.fn)` for mutations
- `useSuspenseQuery()` for SSR + loaders
- Native Convex hooks (e.g. `usePaginatedQuery`) also work — they share the same client

The `ConvexQueryClient` is wired into TanStack's `QueryClient` in `src/router.tsx`. The router wraps the app in `<ConvexProvider>` and `<ConvexBetterAuthProvider>`.

### Auth Flow

1. `__root.tsx` calls a server function `getAuth()` to get the token during SSR
2. Token is passed to `ConvexBetterAuthProvider` as `initialToken`
3. `_authed.tsx` layout guard redirects to `/login` if not authenticated
4. On first authed visit, `users.ensureProfile` mutation creates the user profile in Convex
5. Auth client configured in `src/lib/auth-client.ts`, server-side in `convex/auth.ts`

### AI Search Pipeline

1. User asks a question in the agent chat
2. `guidelineAgent` (Cerebras LLM) decides which tools to call (up to 8 steps)
3. `ragSearch` tool — semantic vector search over embedded document chunks, filtered by source
4. `searchGuidelines` tool — full-text keyword search as fallback
5. Agent synthesises an answer with guideline citations and slugs for UI linking

Document ingestion: PDF upload → client-side text extraction → LLM cleans/classifies → RAG vector indexing + guideline DB entry.

### Key Convex Modules

- `schema.ts` — all tables: `users`, `guidelines`, `guidelineVersions`, `uploadedDocuments`, `chatThreads`, `chatMessages`, `auditLogs`, `searchFeedback`
- `convex.config.ts` — registers Better Auth, RAG, and Agent components
- `guidelineAgent.ts` — AI agent definition with system prompt, tools, and search strategy
- `guidelines.ts` — guideline CRUD, search, seeding
- `documents.ts` — file upload (Convex storage), LLM processing, RAG indexing
- `rag.ts` — RAG component configuration

### Route Structure

Routes are file-based in `src/routes/`. `_authed` is a layout route that requires authentication:
- `/` — landing page
- `/login`, `/signup` — auth pages
- `/_authed/search` — AI agent chat
- `/_authed/browse/`, `/_authed/browse/$category` — browse guidelines by category
- `/_authed/guideline/$slug` — single guideline view
- `/_authed/admin/` — admin dashboard (guidelines, documents management)

### Path Aliases

`@/*` maps to `src/*` (configured in `tsconfig.json` and resolved by `vite-tsconfig-paths`).

### Shadcn Config

New York style, Zinc base color, CSS variables enabled. Components in `@/components/ui`, utils in `@/lib/utils`. Icon library: Lucide. See `components.json`.

### Frontend Aesthetics

Avoid generic "AI slop" design. Make creative, distinctive frontends:

- **Typography**: Avoid Inter, Roboto, Arial, system fonts, Space Grotesk. Choose distinctive, beautiful fonts.
- **Color**: Commit to a cohesive aesthetic. Dominant colors with sharp accents. Draw from IDE themes and cultural aesthetics.
- **Motion**: Use CSS animations and Motion library for React. Focus on high-impact moments (staggered page load reveals) over scattered micro-interactions.
- **Backgrounds**: Layer gradients, geometric patterns, contextual effects — not solid colors.
- Vary between light/dark themes, different fonts, different aesthetics across generations.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
