## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2025-05-15 - [Convex Query Optimization]
**Learning:** Favor database-level sorting via `.order()` on composite indexes (e.g., status + lastUpdated) over in-memory JavaScript `.sort()` calls to reduce latency and memory usage.
**Action:** Always check `schema.ts` for existing composite indexes before implementing in-memory sorting or filtering.
