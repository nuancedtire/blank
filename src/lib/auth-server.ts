import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

const convexUrl =
  process.env.VITE_CONVEX_URL ??
  process.env.CONVEX_CLOUD_ORIGIN ??
  process.env.NEXT_PUBLIC_DEPLOYMENT_URL;
const convexSiteUrl =
  process.env.VITE_CONVEX_SITE_URL ??
  process.env.CONVEX_SITE_ORIGIN ??
  convexUrl;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is required");
}

export const { handler, getToken, fetchAuthQuery, fetchAuthMutation } =
  convexBetterAuthReactStart({
    convexUrl,
    convexSiteUrl: convexSiteUrl!,
  });
