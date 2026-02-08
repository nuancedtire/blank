// DO NOT DELETE THIS FILE!!!
// Custom server entry: intercepts auth requests and proxies to Convex Better Auth
import tanstackHandler from "@tanstack/react-start/server-entry";
import { handler as authHandler } from "./lib/auth-server";

console.log("[server-entry]: using custom server entry in 'src/server.ts'");

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);

    // Proxy /api/auth/* requests to Better Auth handler on Convex
    if (url.pathname.startsWith("/api/auth")) {
      return authHandler(request);
    }

    return tanstackHandler.fetch(request, {
      context: {
        fromFetch: true,
      },
    });
  },
};
