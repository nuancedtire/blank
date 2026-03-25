## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2025-05-15 - [Pre-filter Capping Anti-pattern]
**Learning:** Applying global limits like `.take(100)` to a shared table (e.g., notifications) *before* filtering by the current user's ID will cause data to "disappear" for users whose records aren't in the top 100.
**Action:** Always filter by mandatory criteria (like `userId` or `targetUserIds`) using a targeted index *before* applying pagination or limits.
