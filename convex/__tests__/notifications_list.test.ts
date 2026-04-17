import { describe, it, expect } from "vitest";

// Mocking the list logic from convex/notifications.ts for unit testing
async function listLogic(ctx: any, args: { limit?: number; unreadOnly?: boolean }, user: any) {
  if (!user) return [];
  if (args.limit !== undefined && args.limit <= 0) return [];

  const now = Date.now();
  const results = [];

  const query = ctx.db
    .query("notifications")
    .withIndex("by_createdAt")
    .order("desc");

  for await (const n of query) {
    if (n.expiresAt && n.expiresAt < now) continue;
    const isTargeted = n.isBroadcast || n.targetUserIds?.includes(user._id);
    if (!isTargeted) continue;
    if (n.dismissedBy.includes(user._id)) continue;
    if (args.unreadOnly && n.readBy.includes(user._id)) continue;

    results.push({
      ...n,
      isRead: n.readBy.includes(user._id),
    });

    if (args.limit && results.length >= args.limit) {
      break;
    }
  }

  return results;
}

describe("notifications.list logic", () => {
  const mockUser = { _id: "u1" };
  const now = Date.now();

  it("returns notifications correctly with async iteration", async () => {
    const mockNotifications = [
      { _id: "n1", isBroadcast: true, readBy: [], dismissedBy: [], createdAt: now },
      { _id: "n2", isBroadcast: false, targetUserIds: ["u1"], readBy: [], dismissedBy: [], createdAt: now - 10 },
    ];

    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            order: () => ({
              [Symbol.asyncIterator]: async function* () {
                for (const n of mockNotifications) yield n;
              },
            }),
          }),
        }),
      },
    };

    const result = await listLogic(ctx, {}, mockUser);
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe("n1");
    expect(result[1]._id).toBe("n2");
  });

  it("respects the limit argument and exits early", async () => {
    const mockNotifications = [
      { _id: "n1", isBroadcast: true, readBy: [], dismissedBy: [], createdAt: now },
      { _id: "n2", isBroadcast: true, readBy: [], dismissedBy: [], createdAt: now - 10 },
      { _id: "n3", isBroadcast: true, readBy: [], dismissedBy: [], createdAt: now - 20 },
    ];

    let yields = 0;
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            order: () => ({
              [Symbol.asyncIterator]: async function* () {
                for (const n of mockNotifications) {
                  yields++;
                  yield n;
                }
              },
            }),
          }),
        }),
      },
    };

    const result = await listLogic(ctx, { limit: 1 }, mockUser);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("n1");
    // Verify early exit: it should only have yielded enough to satisfy the limit (1 in this case)
    expect(yields).toBe(1);
  });

  it("filters out expired notifications", async () => {
    const mockNotifications = [
      { _id: "n1", isBroadcast: true, readBy: [], dismissedBy: [], expiresAt: now - 1000, createdAt: now },
      { _id: "n2", isBroadcast: true, readBy: [], dismissedBy: [], expiresAt: now + 1000, createdAt: now - 10 },
    ];

    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            order: () => ({
              [Symbol.asyncIterator]: async function* () {
                for (const n of mockNotifications) yield n;
              },
            }),
          }),
        }),
      },
    };

    const result = await listLogic(ctx, {}, mockUser);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("n2");
  });

  it("filters by targetUserIds", async () => {
    const mockNotifications = [
      { _id: "n1", isBroadcast: false, targetUserIds: ["u2"], readBy: [], dismissedBy: [], createdAt: now },
      { _id: "n2", isBroadcast: false, targetUserIds: ["u1"], readBy: [], dismissedBy: [], createdAt: now - 10 },
    ];

    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            order: () => ({
              [Symbol.asyncIterator]: async function* () {
                for (const n of mockNotifications) yield n;
              },
            }),
          }),
        }),
      },
    };

    const result = await listLogic(ctx, {}, mockUser);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("n2");
  });

  it("handles limit <= 0 correctly", async () => {
    const result = await listLogic({}, { limit: 0 }, mockUser);
    expect(result).toEqual([]);

    const resultNegative = await listLogic({}, { limit: -5 }, mockUser);
    expect(resultNegative).toEqual([]);
  });
});
