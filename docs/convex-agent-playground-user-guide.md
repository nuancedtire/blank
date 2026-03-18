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

If you are using the hosted playground instead of the local CLI, the official docs note that you may also need to enter the playground module path if it is not the default. In this repo the path is the default:

```text
playground
```

Source: [Convex Agent Playground](https://docs.convex.dev/agents/playground)

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

## Playground UI walkthrough

This section explains the actual playground UX using the official Convex playground model and how it applies to this repository.

Official reference:

- [Convex Agent Playground](https://docs.convex.dev/agents/playground)
- [Convex LLM Context](https://docs.convex.dev/agents/context)
- [Convex Debugging](https://docs.convex.dev/agents/debugging)

### 1. Connection panel

This is the first screen or header area you interact with.

You provide:

- Convex deployment URL
- Agent API key
- optional playground module path if not using `convex/playground.ts`

In this repository, use:

- deployment URL: your `VITE_CONVEX_URL`
- module path: `playground`
- API key: the issued agent API key

What it does:

- validates the API key using `isApiKeyValid`
- loads the registered playground agents using `listAgents`

If this step fails, the rest of the UI cannot work.

### 2. Agent selector

Once connected, the playground lists the agents returned by `definePlaygroundAPI(...)`.

In this repo there is one:

- `ED Guidelines Assistant`

What it shows:

- agent name
- instructions
- context options
- storage options
- retry/tool configuration metadata exposed by the API

How to use it:

- confirm you are testing the right agent
- scan the displayed instructions if you want to verify the currently deployed prompt
- use this as a quick sanity check after prompt changes

### 3. User browser

The playground can list users known to the agent component.

Officially, this lets you:

- pick a user
- list that user’s threads

In this repo, the selected user matters because the agent enables other-thread recall through `searchOtherThreads: true`.

What that means in practice:

- if you reuse a user, the agent may retrieve relevant messages from other threads for that same user
- if you want isolated tests, create or select a fresh user

When to reuse a user:

- evaluating memory or consistency over time
- testing whether cross-thread recall helps or hurts answers

When to avoid reuse:

- prompt regression checks
- retrieval precision tests
- clean comparisons between two prompt variants

### 4. Thread browser

After choosing a user, the playground lists that user’s threads.

Officially, threads are the linear history containers for agent conversations. The playground lets you:

- browse threads
- create a new thread
- select an existing thread for inspection or continuation

What thread metadata is useful for:

- title and summary help identify the scenario
- recent message activity helps find the right test conversation

In this repo, create a new thread when you want:

- a clean clinical scenario
- no carry-over from earlier questions in the same conversation
- a reproducible test for a single prompt

Reuse a thread when you want:

- follow-up questioning
- citation consistency across multiple turns
- verification that the agent respects prior “search scope preference” instructions

### 5. Message list

When you select a thread, the playground lists its saved messages.

Per the official docs, the playground can list:

- thread messages
- tool call details
- message metadata

What you should expect to see in a real agent turn:

- the user message
- any assistant tool call messages
- tool result messages
- the final assistant response

Why this matters:

- it tells you whether the answer came from retrieval or from the model alone
- it lets you confirm whether the tool sequence matched the prompt policy
- it exposes failed or partial tool execution that the final answer may hide

For this repo, the expected healthy pattern is usually:

1. user message
2. `ragSearch` tool call and result
3. optional `searchGuidelines` tool call and result
4. optional `searchExternalWeb` tool call and result
5. final assistant answer with citations

### 6. Tool call details

This is one of the most important debugging views.

The official playground exposes tool call details for the selected thread’s messages. Use that view to inspect:

- which tool was called
- which arguments were passed
- what the tool returned
- whether the tool failed or returned empty results

For this project, inspect tool details to verify:

- `ragSearch` was attempted first for local clinical questions
- `searchGuidelines` only ran as a fallback
- `searchExternalWeb` only ran when local content was insufficient or you explicitly asked for web-only behavior

This is the fastest way to spot:

- prompt regressions
- poor tool selection
- empty retrieval results caused by indexing problems
- external search failures

### 7. Message metadata panel

The official docs call out a metadata details view. Use it when you need to inspect the saved structure of a message instead of only the rendered text.

Metadata is useful for checking:

- role
- status
- ordering
- associated agent name
- whether a message is a tool message versus a final assistant message

Why this matters:

- Convex agents save multiple message records per turn
- tool calls and tool results are separate from the final assistant answer
- debugging ordering problems is easier at the metadata layer than in the rendered transcript

If something looks off in the UI, the official debugging docs also recommend inspecting the agent component tables in the Convex dashboard, especially:

- `threads`
- `messages`
- `streamingMessages`

Source: [Convex Debugging](https://docs.convex.dev/agents/debugging)

### 8. Context lookup panel

This is the part of the playground used to inspect what the model is likely to receive before generation.

Officially, the playground lets you:

- experiment with contextual message lookup
- adjust `contextOptions`
- fetch prompt context without generating a reply

This maps to the exported `fetchPromptContext` API and the context system described in the Convex docs.

The most important controls conceptually are:

- recent messages
- text search on or off
- vector search on or off
- search result limit
- message range around matches
- whether to search other threads
- whether to exclude tool messages

Source: [Convex LLM Context](https://docs.convex.dev/agents/context)

How to use this well in this repo:

- increase recent messages if a follow-up question depends heavily on the immediate thread history
- keep `searchOtherThreads` in mind because this agent already enables cross-thread retrieval by default
- test with tool messages included and excluded if you suspect the agent is overfitting to tool output formatting
- fetch context first when the agent answer feels “contaminated” by old conversations

### 9. Send/generate panel

The playground includes a message composer for sending a new turn to the selected thread.

Officially, this lets you:

- send a message to the thread
- choose configurable saving options

What this means in practice:

- you can test a fresh prompt directly against the real deployed agent
- you can often control whether the resulting call should be persisted in the thread history
- you can compare generation behavior under different context options

Use this panel for:

- prompt regression testing
- citation checks
- tool-selection verification
- comparing “local first” versus “web only” instruction behavior

### 10. Create-thread controls

The official playground API supports thread creation with user association and optional metadata like title and summary.

That means the UI can be used not just to continue conversations, but to intentionally create test fixtures such as:

- `Head injury CT criteria`
- `DKA local summary`
- `Web-only NICE sepsis lookup`

This is useful because thread metadata helps keep repeated testing organized, especially when many users and scenarios accumulate.

## What each playground-backed function does

The playground UI is powered by the functions exported from [convex/playground.ts](/Users/fazeennasser/development/blank/convex/playground.ts).

### `isApiKeyValid`

Purpose:

- checks whether the provided Agent API key is valid for the deployment

In the UI:

- used during connection/authentication

### `listAgents`

Purpose:

- returns the registered agents exposed to the playground

In the UI:

- populates the agent selector
- displays the current instructions, tools, and context settings

### `listUsers`

Purpose:

- lists users known to the agent component

In the UI:

- powers the user picker

Why it matters here:

- user choice affects cross-thread retrieval behavior

### `listThreads`

Purpose:

- lists the selected user’s threads

In the UI:

- powers the thread browser

### `listMessages`

Purpose:

- returns the selected thread’s messages, including stream synchronization data

In the UI:

- renders the transcript
- exposes tool call/result messages
- supports metadata inspection

### `createThread`

Purpose:

- creates a new thread for a user with optional title and summary

In the UI:

- used by the “new thread” or equivalent control

### `generateText`

Purpose:

- sends the prompt through the chosen agent in the selected thread
- stores the resulting messages and tool-call outputs

In the UI:

- drives the main “send message” action

### `fetchPromptContext`

Purpose:

- fetches context messages without calling the LLM

In the UI:

- powers the context inspection/debugging area
- lets you see what the agent is likely to receive before generation

## How to learn the UI efficiently

If you want to build intuition quickly, use this sequence:

1. Connect with the deployment URL and API key.
2. Select `ED Guidelines Assistant`.
3. Pick or create a test user.
4. Create a new thread titled for the scenario you are testing.
5. Send a straightforward local-guideline question.
6. Open the tool details and confirm `ragSearch` ran first.
7. Open the context panel and inspect what messages were used.
8. Retry with altered context options and compare behavior.
9. Repeat with a web-only prompt and confirm `searchExternalWeb` is used appropriately.

## Practical UX advice for this repository

The playground is most useful here when you use it as a debugging console, not just a chat window.

Focus on these views in this order:

1. final answer
2. tool call details
3. context lookup
4. message metadata

That order usually tells you:

- whether the answer is acceptable
- whether the tool choice was correct
- whether the retrieved context explains the answer
- whether the saved message structure matches what you think happened

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
