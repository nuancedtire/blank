## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2026-04-01 - [Bounded Notification Queries & N+1 Resolution]
**Learning:** User-facing notification queries like 'unread count' or 'mark all as read' can easily become full table scans if not bounded by time. Applying a 30-day lookback using the 'by_createdAt' index ensures constant-time performance regardless of total table size. Additionally, admin list views often suffer from N+1 patterns when fetching record creators; batch-fetching with 'Promise.all' and a Map resolves this.
**Action:** Use 'NOTIFICATIONS_LOOKBACK_MS' to bound user notification queries and always batch-fetch associated entities in list queries.
