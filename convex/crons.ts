import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire-mh-sessions",
  { hours: 1 },
  internal.mentalHealth.sessions.expireOldSessions,
);

crons.interval(
  "alert-idle-sessions",
  { minutes: 5 },
  internal.mentalHealth.sessions.checkIdleSessions,
);

export default crons;
