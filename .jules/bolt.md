## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2025-05-16 - [Safe Dataset Reduction for Multi-tenant Scans]
**Learning:** Applying a simple `.take(100)` limit on a query before filtering for user-specific results (like `targetUserIds` in notifications) can lead to empty lists if the relevant items fall outside the most recent slice. This is a common performance anti-pattern.
**Action:** Use time-based index filters (e.g., `q.gt("createdAt", timestamp)`) to safely reduce scan size without risking data loss for the end-user.
