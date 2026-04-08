## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Convex N+1 Query Resolution]
**Learning:** Resolving N+1 issues in list queries by collecting unique IDs and batch-fetching them with `Promise.all(ids.map(id => ctx.db.get(id)))` significantly reduces database round-trips. Using a Map for lookup ensures O(1) complexity during result mapping.
**Action:** Scan for `ctx.db.get` calls inside loops in query handlers and refactor to batch-fetching.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.
