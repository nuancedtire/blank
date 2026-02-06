import { createAPIFileRoute } from "@tanstack/react-start/api";
import { handler } from "@/lib/auth-server";

export const Route = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => handler(request),
  POST: ({ request }) => handler(request),
});
