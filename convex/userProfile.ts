import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type UsersCtx = QueryCtx | MutationCtx;

export type AuthProfile = {
  _id?: string;
  email: string;
  name?: string | null;
  userId?: string | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function deriveDisplayName(authUser: AuthProfile): string {
  const name = authUser.name?.trim();
  if (name) return name;
  return normalizeEmail(authUser.email).split("@")[0];
}

export async function findUserProfile(
  ctx: UsersCtx,
  authUser: AuthProfile,
): Promise<Doc<"users"> | null> {
  // Preferred path: Better Auth's linked app user id.
  if (authUser.userId) {
    const linked = await ctx.db.get(authUser.userId as Id<"users">);
    if (linked) return linked;
  }

  const rawEmail = authUser.email.trim();
  const normalizedEmail = normalizeEmail(rawEmail);

  const exact = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", rawEmail))
    .first();
  if (exact) return exact;

  if (normalizedEmail !== rawEmail) {
    const normalized = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (normalized) return normalized;
  }

  // Legacy fallback: handle case-mismatched historical rows.
  const allUsers = await ctx.db.query("users").collect();
  return (
    allUsers.find((user) => normalizeEmail(user.email) === normalizedEmail) ??
    null
  );
}
