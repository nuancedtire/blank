import { createAPIFileRoute } from "@tanstack/start/api";
import { auth } from "@/lib/auth";

/**
 * Better Auth API catch-all route for TanStack Start.
 *
 * This route handles all authentication-related API requests:
 * - POST /api/auth/sign-in/email - Email sign in
 * - POST /api/auth/sign-up/email - Email sign up
 * - POST /api/auth/sign-out - Sign out
 * - GET /api/auth/session - Get current session
 * - And other Better Auth endpoints
 */

export const APIRoute = createAPIFileRoute("/api/auth/$")({
  GET: async ({ request }) => {
    return auth.handler(request);
  },
  POST: async ({ request }) => {
    return auth.handler(request);
  },
});
