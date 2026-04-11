## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2025-05-15 - [Convex N+1 Query Resolution]
**Learning:** Resolving N+1 issues in list queries by collecting unique IDs and batch-fetching them with 'Promise.all(ids.map(id => ctx.db.get(id)))' triggers Convex's automatic batching. Mapping results back via a Map provides O(1) lookup during reconstruction.
**Action:** Use batch-fetching for document/user lookups in all list-returning Convex queries to minimize database round-trips.
