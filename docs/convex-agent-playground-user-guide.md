# Convex Agent Playground User Guide

This guide explains how to enable and use the Convex Agent Playground for the current ED Guidelines agent in this repository.

It assumes the playground API is exported from [convex/playground.ts](/Users/fazeennasser/development/blank/convex/playground.ts) and that the active agent is the `guidelineAgent` defined in [convex/guidelineAgent.ts](/Users/fazeennasser/development/blank/convex/guidelineAgent.ts).

## What the playground is for

The Convex Agent Playground is a debugging and evaluation UI for Convex agents. It lets you:

- inspect the agent instructions currently deployed to Convex
- send messages directly to the agent without going through the app UI
- create or reuse users and threads
- inspect tool calls, retrieved context, and saved messages
- compare how the agent behaves across different prompts and context settings

For this project, the playground is the fastest way to verify:

- local guideline retrieval via `ragSearch`
- fallback local keyword search via `searchGuidelines`
- optional external NICE/RCEM search via `searchExternalWeb`
- the final citation formatting required by the agent prompt

## Prerequisites

You need all of the following:

- Node.js and `pnpm`
- a working Convex deployment
- local env configured in `.env.local` or equivalent
- the Convex backend running or at least deployed with the latest functions
- valid provider secrets in Convex for the current agent

For this repository, the practical minimum is:

- `CONVEX_DEPLOYMENT`
- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `CEREBRAS_API_KEY`
- `OPENAI_API_KEY` if you want embeddings-dependent behavior available

## Files involved

These files are the key pieces of the playground setup:

- [convex/playground.ts](/Users/fazeennasser/development/blank/convex/playground.ts): exports the official playground API functions
- [convex/guidelineAgent.ts](/Users/fazeennasser/development/blank/convex/guidelineAgent.ts): defines the agent, prompt, tools, and model configuration
- [package.json](/Users/fazeennasser/development/blank/package.json): includes the `agent:playground` script
- [convex/_generated/api.d.ts](/Users/fazeennasser/development/blank/convex/_generated/api.d.ts): Convex-generated API typing now includes the `playground` module

## One-time setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Confirm local environment

Make sure your `.env.local` points at the correct Convex deployment.

Typical values look like:

```bash
CONVEX_DEPLOYMENT=dev:your-project-name
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_CONVEX_SITE_URL=https://your-project.convex.site
```

### 3. Push the latest Convex functions

If you are developing locally:

```bash
pnpm convex:dev
```

If you want to update the deployed environment instead:

```bash
pnpm convex:deploy
```

This matters because the playground calls the Convex functions exported from `convex/playground.ts`. If those functions are not deployed, the playground cannot talk to your agent.

## Issue an Agent Playground API key

The playground requires an agent API key managed by the `@convex-dev/agent` component.

Run:

```bash
npx convex run --component agent apiKeys:issue '{name:"playground"}'
```

That returns a key string. For the current deployment, the issued key is:

```text
j57aen33565tvyvwxvfe1edgp1834q2s
```

Treat this as a secret. Anyone with the key can use the playground API against your deployment.

If you want to rotate the key later, issue a new one and stop using the old one.

## Start the playground

Run:

```bash
pnpm run agent:playground
```

On this repository, the CLI auto-detects the current Convex URL from the env file and serves the playground locally. The local URL reported during validation was:

```text
http://localhost:4173/
```

If the CLI needs to fetch `@convex-dev/agent-playground` on first run, that is normal.

## Connect the playground

When the playground UI opens, provide:

- your Convex deployment URL
- the Agent API key

Use:

- Convex URL: the value of `VITE_CONVEX_URL`
- API key: the issued key above

Once connected, the playground should discover the agent exported by the playground module:

- `ED Guidelines Assistant`

## How this project is wired

The playground is not attached to every agent automatically. It only exposes the agents you return from `definePlaygroundAPI(...)`.

In this repository:

- the exported playground API is in [convex/playground.ts](/Users/fazeennasser/development/blank/convex/playground.ts)
- it registers exactly one agent: `guidelineAgent`
- user labels are resolved from the app `users` table when available

That means the playground is testing the real agent configuration used by the app, not a sample or mock agent.

## Recommended startup workflow

Use this order when testing:

1. Start Convex:

```bash
pnpm convex:dev
```

2. In another terminal, start the playground:

```bash
pnpm run agent:playground
```

3. Open the local playground URL.

4. Enter the Convex URL and API key.

5. Select the `ED Guidelines Assistant`.

6. Create a user and thread for the test scenario.

7. Send prompts and inspect the resulting tool calls and context.

If you also want to compare app UI behavior with playground behavior, run the frontend too:

```bash
pnpm dev
```

## How to use the playground effectively

### Pick a user deliberately

The agent enables cross-thread context search:

- `searchOtherThreads: true`

That means the selected user matters. If you reuse the same playground user across many tests, the agent may recall prior thread content.

Use this pattern:

- use one user for repeated longitudinal testing
- use a fresh user when you want isolated behavior

### Use threads intentionally

Threads preserve message history. Reusing a thread is useful when you want to test:

- follow-up questions
- clarifications
- whether citations stay consistent across turns
- whether the agent respects prior search-scope preferences

Create a new thread when you want a clean run without earlier turns affecting context.

### Watch the tool calls

For this agent, tool order is important. The system prompt tells the agent to:

1. use `ragSearch` first
2. use `searchGuidelines` only if semantic retrieval is insufficient
3. use `searchExternalWeb` only when local guidance is insufficient or explicitly requested

In the playground, verify that the tool sequence matches that behavior. If the agent skips directly to web search without reason, that is a prompt or tool-selection regression.

### Inspect context and retrieved messages

The playground can show prompt context and stored thread messages. Use that to verify:

- the right recent messages were included
- other-thread recall is or is not influencing the answer
- the agent did not hallucinate a source without any retrieval evidence

### Validate output structure

For this project, a good answer should usually include:

- a practical action-oriented response
- concise caveats and red flags
- explicit source citations
- the closing sentence:

```text
This is a summary — always refer to the full guideline for complete clinical guidance.
```

If those output constraints disappear, the prompt has drifted or the model is not following the instructions consistently.

## Suggested test prompts

Use prompts that exercise each retrieval mode.

### Local RAG test

```text
Adult head injury: when should I request CT imaging?
```

Expected behavior:

- `ragSearch` is called first
- the answer cites local guideline sources if relevant content exists

### Local keyword fallback test

```text
Show me the local guideline on procedural sedation.
```

Expected behavior:

- `ragSearch` may run first
- `searchGuidelines` may be used if semantic retrieval is weak

### Web-constrained lookup test

```text
Search scope preference: web only. What does NICE say about suspected sepsis risk stratification?
```

Expected behavior:

- the agent prefers `searchExternalWeb`
- results are limited to NICE or RCEM sources

### Citation-format regression test

```text
Summarize the local DKA guidance for initial ED management and include sources.
```

Expected behavior:

- citations include title, source, file name, and slug for local documents

## Troubleshooting

### The playground starts, but no agents appear

Check:

- `convex/playground.ts` is deployed
- `pnpm convex:dev` is running or `pnpm convex:deploy` completed
- the API key is valid for the same deployment you connected to

### API key is rejected

Usually one of these is wrong:

- the key was issued for a different deployment
- the key was copied incorrectly
- the component state changed and the key needs to be reissued

Issue another key:

```bash
npx convex run --component agent apiKeys:issue '{name:"playground"}'
```

### The agent responds poorly or fails to answer

Check provider configuration in Convex:

- `CEREBRAS_API_KEY`
- `OPENAI_API_KEY`

This agent uses Cerebras for the chat model and may use OpenAI embeddings depending on how the retrieval path is exercised.

### The agent does not find local content

Check:

- the document was uploaded and indexed
- the RAG namespace contains entries for your guideline content
- `ragSearch` returns sources in the playground tool log

### TypeScript fails locally

The current repository already has unrelated `pdfjs-dist` typing errors in [src/lib/pdf-thumbnail.ts](/Users/fazeennasser/development/blank/src/lib/pdf-thumbnail.ts#L10) and [src/lib/pdf-thumbnail.ts](/Users/fazeennasser/development/blank/src/lib/pdf-thumbnail.ts#L56). Those do not come from the playground integration.

## Security and operational notes

- do not commit long-lived playground API keys to the repository
- prefer issuing separate keys for separate environments
- rotate keys if they are shared too broadly
- remember that playground testing can create real agent threads and stored messages in Convex

## Useful commands

```bash
pnpm convex:dev
pnpm convex:deploy
pnpm run agent:playground
npx convex run --component agent apiKeys:issue '{name:"playground"}'
```

## Official docs

- [Convex Agents overview](https://docs.convex.dev/agents)
- [Convex Agent Playground](https://docs.convex.dev/agents/playground)
- [Convex Agent usage](https://docs.convex.dev/agents/agent-usage)
