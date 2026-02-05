import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * Authentication helpers for Convex functions.
 *
 * These helpers provide consistent authentication checks across
 * all Convex queries, mutations, and actions.
 */

/**
 * Get the current user ID from the authentication context.
 *
 * @param ctx - The Convex context (query, mutation, or action)
 * @returns The user ID if authenticated, or null if not
 *
 * @example
 * ```ts
 * const userId = await getCurrentUserId(ctx);
 * if (userId) {
 *   // User is authenticated
 * }
 * ```
 */
export async function getCurrentUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<string | null> {
  // Placeholder implementation
  // Replace with actual Better Auth + Convex integration
  // This would typically check the auth token from the request context
  //
  // Example with Better Auth:
  // const identity = await ctx.auth.getUserIdentity();
  // return identity?.subject ?? null;

  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/**
 * Require authentication for a Convex function.
 * Throws an error if the user is not authenticated.
 *
 * @param ctx - The Convex context (query, mutation, or action)
 * @returns The authenticated user ID
 * @throws ConvexError if not authenticated
 *
 * @example
 * ```ts
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     const userId = await requireAuth(ctx);
 *     // User is guaranteed to be authenticated here
 *   },
 * });
 * ```
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<string> {
  const userId = await getCurrentUserId(ctx);

  if (!userId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  return userId;
}

/**
 * Check if the current user is authenticated.
 *
 * @param ctx - The Convex context
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<boolean> {
  const userId = await getCurrentUserId(ctx);
  return userId !== null;
}
