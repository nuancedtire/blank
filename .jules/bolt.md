## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2025-05-15 - [N+1 Query Resolution in Convex]
**Learning:** Performing database lookups () inside a loop for every item in a list is a major performance bottleneck (N+1 query problem). Convex handlers execute serially, but database fetches can be parallelized.
**Action:** Resolve N+1 issues by collecting unique IDs and batch-fetching them with `Promise.all(ids.map(id => ctx.db.get(id)))`, then mapping results back to the original objects via a Map.

## 2025-05-15 - [N+1 Query Resolution in Convex]
**Learning:** Performing database lookups (ctx.db.get) inside a loop for every item in a list is a major performance bottleneck (N+1 query problem). Convex handlers execute serially, but database fetches can be parallelized.
**Action:** Resolve N+1 issues by collecting unique IDs and batch-fetching them with `Promise.all(ids.map(id => ctx.db.get(id)))`, then mapping results back to the original objects via a Map.
