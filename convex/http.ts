import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { interpreterRealtimeToken } from "./interpreter/realtimeRelay";
import { mhRealtimeToken } from "./mentalHealth/realtimeRelay";

const http = httpRouter();

// Register Better Auth HTTP routes
authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/interpreter/realtime-token",
  method: "POST",
  handler: interpreterRealtimeToken,
});

// Mental health companion voice relay
http.route({
  path: "/mh/realtime-token",
  method: "POST",
  handler: mhRealtimeToken,
});

export default http;
