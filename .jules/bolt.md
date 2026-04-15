## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2026-04-07 - [Optimizing Admin List Payloads]
**Learning:** Admin dashboards and management lists often fetch entire documents including heavy Markdown content, leading to large payload sizes.
**Action:** Use "Summary" queries that exclude heavy fields like 'content' for list views, and implement a fetch-on-demand pattern for detail views or edit forms. Use database-level sorting via indexes instead of in-memory .sort().

## 2025-05-16 - [Optimizing List Queries with Async Iteration]
**Learning:** Using `.collect()` on a table with manual filtering and a limit is inefficient as it fetches the entire table into memory. Async iteration (`for await`) allows for early exit once the limit is reached, saving memory and database read operations.
**Action:** Prefer async iteration over `.collect()` when implementing queries that require JavaScript-level filtering but only return a subset of results (e.g., via a `limit`).
