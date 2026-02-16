import { betterAuth } from "better-auth/minimal";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { emailOTP } from "better-auth/plugins/email-otp";
import { Resend } from "resend";
import authConfig from "./auth.config";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "./_generated/dataModel";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = process.env.SITE_URL ?? process.env.VITE_SITE_URL!;

  return betterAuth({
    appName: "ED Guidelines",
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    socialProviders: {
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID as string,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
        tenantId: "common",
        prompt: "select_account",
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        prompt: "select_account",
      },
    },
    plugins: [
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const { error } = await resend.emails.send({
            from: "ED Guidelines <noreply@fazeen.dev>",
            to: email,
            subject:
              type === "sign-in"
                ? `Your sign-in code: ${otp}`
                : `Your verification code: ${otp}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #0d9488; margin: 0 0 8px;">ED Clinical Guidelines</h2>
                <p style="color: #64748b; margin: 0 0 24px; font-size: 14px;">Your verification code</p>
                <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f766e;">${otp}</span>
                </div>
                <p style="color: #64748b; font-size: 13px; margin: 0;">This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
              </div>
            `,
          });
          if (error) {
            console.error("Failed to send OTP email via Resend:", error);
            throw new Error(`Failed to send verification email: ${error.message}`);
          }
        },
        otpLength: 6,
        expiresIn: 300,
        disableSignUp: false,
      }),
      convex({ authConfig }),
    ],
  });
};

// Query to get the current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});
