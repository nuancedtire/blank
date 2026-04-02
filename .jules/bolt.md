## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2025-05-16 - [N+1 Queries in Admin Lists]
**Learning:** Sequential database gets (`ctx.db.get(id)`) within a loop create a significant latency bottleneck (N+1 query problem).
**Action:** Always batch-fetch related documents by collecting unique IDs and using `Promise.all(ids.map(id => ctx.db.get(id)))`. Use a `Map` to associate results back to the original items.

## 2025-05-16 - [Bounding Table Scans with Time-based Indexes]
**Learning:** For tables that grow over time (like notifications or audit logs), `ctx.db.query(table).collect()` becomes increasingly expensive.
**Action:** Use a defined lookback window (e.g., 30 days) with a `by_createdAt` index filter (`q.gt("createdAt", now - LOOKBACK)`) to bound the query and prevent full table scans.
