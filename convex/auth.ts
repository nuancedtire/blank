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
    appName: "Aide",
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
            from: "Aide <noreply@fazeen.dev>",
            to: email,
            subject:
              type === "sign-in"
                ? `Your sign-in code: ${otp}`
                : `Your verification code: ${otp}`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Delius+Swash+Caps&display=swap');
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #0f172a !important; }
      .email-card { background-color: #1e293b !important; border-color: #334155 !important; }
      .email-heading { color: #e2e8f0 !important; }
      .email-subtext { color: #94a3b8 !important; }
      .email-otp-box { background: linear-gradient(135deg, #164e63 0%, #1e3a5f 100%) !important; border-color: #0e7490 !important; }
      .email-otp { color: #22d3ee !important; }
      .email-footer { background-color: #0f172a !important; border-color: #334155 !important; }
      .email-footer-text { color: #64748b !important; }
      .email-expire { color: #94a3b8 !important; }
      .email-expire strong { color: #cbd5e1 !important; }
      .email-divider { border-color: #334155 !important; }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 24px 16px; background-color: #f0fdfa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 440px; margin: 0 auto;">

    <!-- Logo -->
    <div style="text-align: center; padding: 8px 0 28px;">
      <span style="font-family: 'Delius Swash Caps', Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 700; font-style: italic; color: #0891B2;">A</span><span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: #0891B2;">ide</span>
    </div>

    <!-- Card -->
    <div class="email-card" style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">

      <!-- Top accent bar -->
      <div style="height: 3px; background: linear-gradient(90deg, #0891B2, #22C55E);"></div>

      <!-- Content -->
      <div style="padding: 36px 32px 32px;">
        <p class="email-heading" style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0 0 6px; text-align: center;">Verification code</p>
        <p class="email-subtext" style="color: #64748b; font-size: 13px; margin: 0 0 28px; text-align: center; line-height: 1.5;">Enter this code to ${type === "sign-in" ? "sign in to" : "verify"} your account</p>

        <!-- OTP Box -->
        <div class="email-otp-box" style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%); border: 1px solid #99f6e4; border-radius: 12px; padding: 28px 24px; text-align: center; margin: 0 0 28px;">
          <span class="email-otp" style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0891B2; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;">${otp}</span>
        </div>

        <!-- Divider -->
        <hr class="email-divider" style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px;">

        <p class="email-expire" style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6; text-align: center;">
          This code expires in <strong style="color: #64748b;">5 minutes</strong>.<br>
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 0 8px; text-align: center;">
      <p class="email-footer-text" style="color: #94a3b8; font-size: 11px; margin: 0;">Aide &mdash; AI-powered clinical guidelines for Emergency Departments</p>
    </div>

  </div>
</body>
</html>
            `,
          });
          if (error) {
            console.error("Failed to send OTP email via Resend:", error);
            throw new Error(
              `Failed to send verification email: ${error.message}`,
            );
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
