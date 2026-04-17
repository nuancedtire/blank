## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2026-04-07 - [Optimizing Admin List Payloads]
**Learning:** Admin dashboards and management lists often fetch entire documents including heavy Markdown content, leading to large payload sizes.
**Action:** Use "Summary" queries that exclude heavy fields like 'content' for list views, and implement a fetch-on-demand pattern for detail views or edit forms. Use database-level sorting via indexes instead of in-memory .sort().

## 2025-05-16 - [Early-exit with Async Iteration]
**Learning:** When database-level filtering (e.g., using `.withIndex().eq()`) is not possible for all criteria, using async iteration (`for await`) instead of `.collect().filter()` allows for early-exit when a `limit` is reached. This prevents scanning the entire table once enough results are found.
**Action:** Favor async iteration with manual `break` for filtered list queries that support a `limit`.
