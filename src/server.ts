// DO NOT DELETE THIS FILE!!!
// Custom server entry: intercepts auth requests and proxies to Convex Better Auth
import tanstackHandler from "@tanstack/react-start/server-entry";
import { handler as authHandler } from "./lib/auth-server";

console.log("[server-entry]: using custom server entry in 'src/server.ts'");

const ALLOWED_PDF_HOST_SUFFIXES = ["nice.org.uk", "rcem.ac.uk"];

function isAllowedPdfHost(hostname: string): boolean {
  return ALLOWED_PDF_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);

    // Proxy /api/auth/* requests to Better Auth handler on Convex
    if (url.pathname.startsWith("/api/auth")) {
      return authHandler(request);
    }

    // Proxy external NICE/RCEM PDFs through same-origin to avoid browser CORS failures in pdf.js.
    if (url.pathname === "/api/pdf-proxy") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      const target = url.searchParams.get("url");
      if (!target) {
        return new Response("Missing required 'url' query parameter", {
          status: 400,
        });
      }

      let targetUrl: URL;
      try {
        targetUrl = new URL(target);
      } catch {
        return new Response("Invalid URL", { status: 400 });
      }

      if (!["http:", "https:"].includes(targetUrl.protocol)) {
        return new Response("Unsupported URL protocol", { status: 400 });
      }

      if (!isAllowedPdfHost(targetUrl.hostname)) {
        return new Response("URL host is not allowed", { status: 403 });
      }

      const upstreamHeaders = new Headers();
      const range = request.headers.get("range");
      if (range) upstreamHeaders.set("range", range);

      const ifRange = request.headers.get("if-range");
      if (ifRange) upstreamHeaders.set("if-range", ifRange);
      const ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch) upstreamHeaders.set("if-none-match", ifNoneMatch);
      const ifModifiedSince = request.headers.get("if-modified-since");
      if (ifModifiedSince) upstreamHeaders.set("if-modified-since", ifModifiedSince);

      let upstreamResponse: Response;
      try {
        upstreamResponse = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: upstreamHeaders,
          redirect: "follow",
        });
      } catch {
        return new Response("Failed to fetch source PDF", {
          status: 502,
        });
      }

      if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
        return new Response("Failed to fetch source PDF", {
          status: 502,
        });
      }

      const contentType = upstreamResponse.headers.get("content-type") ?? "";
      const looksLikePdf =
        contentType.toLowerCase().includes("pdf") ||
        targetUrl.pathname.toLowerCase().endsWith(".pdf");

      if (!looksLikePdf) {
        return new Response("Source is not a PDF", { status: 415 });
      }

      const headers = new Headers();
      const passthroughHeaders = [
        "accept-ranges",
        "cache-control",
        "content-length",
        "content-range",
        "content-type",
        "etag",
        "last-modified",
      ];

      for (const name of passthroughHeaders) {
        const value = upstreamResponse.headers.get(name);
        if (value) headers.set(name, value);
      }

      if (!headers.has("cache-control")) {
        headers.set(
          "cache-control",
          "public, max-age=86400, stale-while-revalidate=604800",
        );
      }
      headers.set("x-content-type-options", "nosniff");

      return new Response(
        request.method === "HEAD" ? null : upstreamResponse.body,
        {
          status: upstreamResponse.status,
          headers,
        },
      );
    }

    return tanstackHandler.fetch(request);
  },
};
