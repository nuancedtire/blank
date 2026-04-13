import { describe, it, expect, vi } from "vitest";

// Mocking the batch-fetching logic from listAll for unit testing
async function listAllLogic(ctx: any, notifications: any[]) {
  // Batch fetch creators to avoid N+1 query problem
  const creatorIds = [...new Set(notifications.map((n) => n.createdBy))];
  const creators = await Promise.all(creatorIds.map((id) => ctx.db.get(id)));
  const creatorsMap = new Map(
    creators
      .filter((c: any): c is any => !!c)
      .map((c: any) => [c._id, c])
  );

  return notifications.map((n) => {
    const creator = creatorsMap.get(n.createdBy);
    return {
      ...n,
      creatorName: creator?.name || "Unknown",
      creatorEmail: creator?.email || "Unknown",
      readCount: n.readBy.length,
    };
  });
}

describe("notifications.listAll logic", () => {
  it("resolves creator details correctly using batch fetching", async () => {
    const mockUser = { _id: "u1", name: "Bolt", email: "bolt@example.com" };
    const mockNotifications = [
      { _id: "n1", createdBy: "u1", title: "Test 1", readBy: [1, 2] },
      { _id: "n2", createdBy: "u1", title: "Test 2", readBy: [] },
    ];

    const ctx = {
      db: {
        get: vi.fn().mockImplementation(async (id) => (id === "u1" ? mockUser : null)),
      },
    };

    const result = await listAllLogic(ctx, mockNotifications);

    expect(result).toHaveLength(2);
    expect(result[0].creatorName).toBe("Bolt");
    expect(result[0].readCount).toBe(2);
    expect(result[1].creatorName).toBe("Bolt");
    expect(result[1].readCount).toBe(0);

    // Verify batching: db.get should only be called ONCE for "u1"
    expect(ctx.db.get).toHaveBeenCalledTimes(1);
    expect(ctx.db.get).toHaveBeenCalledWith("u1");
  });

  it("handles missing creators gracefully", async () => {
    const mockNotifications = [
      { _id: "n1", createdBy: "u99", title: "Test 1", readBy: [] },
    ];

    const ctx = {
      db: {
        get: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await listAllLogic(ctx, mockNotifications);

    expect(result[0].creatorName).toBe("Unknown");
    expect(ctx.db.get).toHaveBeenCalledTimes(1);
  });
});
