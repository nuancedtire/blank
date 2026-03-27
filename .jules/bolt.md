## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2025-05-16 - [Server-side Projection in Convex]
**Learning:** Convex 'Query' objects do not support '.map()' for projection. Mapping must be performed after '.collect()' or '.take()' resolves to the results array. Implementing this on the server prevents the transfer of heavy fields (like 'content' markdown) to the client for list views, significantly reducing network payload and client memory usage.
**Action:** Always project only required fields in summary/list queries to avoid over-fetching large document fields.
