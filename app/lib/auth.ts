import { betterAuth } from "better-auth";

export const auth = betterAuth({
  appName: "ED Guidelines",
  baseURL: process.env.VITE_SITE_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "development-secret-change-in-production",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // 1 day
  },
});
