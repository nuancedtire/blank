## 2025-05-15 - [Efficient Dataset Retrieval in Convex]
**Learning:** Fetching an entire table with `.collect()` and filtering/sorting on the client is a major performance anti-pattern as the dataset grows. Using targeted indexes and `.take(limit)` on the server significantly reduces payload size and memory pressure.
**Action:** Always prefer server-side pagination or targeted queries over full table scans for dashboard-style lists.

## 2025-05-15 - [Chat UI Re-renders]
**Learning:** Long chat threads can suffer from performance degradation during streaming if each new chunk causes all previous message bubbles to re-render.
**Action:** Memoize `MessageBubble` components with `React.memo` to isolate re-renders to only the active streaming message.

## 2026-04-09 - [Convex N+1 Batching]
**Learning:** Sequential `ctx.db.get()` calls inside a loop create an N+1 bottleneck. Convex handles parallel requests efficiently via `Promise.all()`.
**Action:** Always batch-fetch related documents by collecting unique IDs and using `Promise.all(ids.map(id => ctx.db.get(id)))`.
