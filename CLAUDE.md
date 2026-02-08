# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start development server on port 3000
- `pnpm build` - Build for production
- `pnpm serve` - Preview production build
- `pnpm test` - Run tests with Vitest

### Shadcn Components
- `pnpx shadcn@latest add <component>` - Add new Shadcn components (use latest version)

## Architecture

This is a TanStack Start application - a type-safe, client-first, full-stack React framework built on top of:

### Core Stack
- **TanStack Router**: File-based routing with type-safe navigation
- **TanStack Query**: Server state management with SSR integration
- **React 19**: Latest React with concurrent features
- **Vite**: Build tool and dev server
- **TypeScript**: Strict type checking enabled
- **Tailwind CSS v4**: Utility-first styling with CSS variables

### Project Structure
- `src/routes/` - File-based routes (auto-generates `routeTree.gen.ts`)
- `src/components/` - Reusable React components  
- `src/integrations/tanstack-query/` - Query client setup and providers
- `src/lib/utils.ts` - Utility functions (includes clsx/tailwind-merge)
- `src/utils/seo.ts` - SEO helper functions
- Path aliases: `@/*` maps to `src/*`

### Key Architecture Patterns

**Router Setup**: The router is created via `getRouter()` in `src/router.tsx` which integrates TanStack Query context and SSR. Routes are auto-generated from the file system.

**Query Integration**: TanStack Query is pre-configured with SSR support through `setupRouterSsrQueryIntegration`. The query client is accessible in route contexts.

**Root Layout**: `src/routes/__root.tsx` defines the HTML document structure, includes devtools, and provides navigation links. It uses `createRootRouteWithContext` for type-safe context passing.

**Styling**: Uses Tailwind CSS v4 with the Vite plugin. Shadcn components are configured with "new-york" style, Zinc base color, and CSS variables enabled.

**TypeScript**: Strict mode with additional linting rules (`noUnusedLocals`, `noUnusedParameters`, etc.). Uses modern ESNext module resolution.

### Development Notes
- Demo files (prefixed with `demo`) can be safely deleted
- The project uses pnpm as the package manager
- Devtools are included for both Router and Query in development
- Routes support loaders, error boundaries, and not-found components
- File-based routing automatically generates type-safe route definitions

### Frontend Aesthetics
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!