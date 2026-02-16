import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Loader2, ArrowLeft, Mail, KeyRound, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: AuthPage,
});

type Step = "email" | "otp";

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/* ─── Animated EKG line ─── */
function EkgLine() {
  return (
    <svg
      viewBox="0 0 600 80"
      className="w-full h-16 opacity-30"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M0,40 L120,40 L140,40 L155,10 L170,70 L185,20 L200,50 L215,35 L230,40 L600,40"
        fill="none"
        stroke="url(#ekgGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: 2.5,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 1.5,
        }}
      />
      <defs>
        <linearGradient id="ekgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0" />
          <stop offset="30%" stopColor="#22D3EE" />
          <stop offset="70%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Floating vitals particle ─── */
function VitalParticle({
  delay,
  x,
  y,
  size,
}: {
  delay: number;
  x: string;
  y: string;
  size: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, transparent 70%)`,
      }}
      animate={{
        y: [0, -20, 0],
        opacity: [0.2, 0.6, 0.2],
        scale: [1, 1.3, 1],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

/* ─── Decorative side panel ─── */
function BrandPanel() {
  return (
    <div className="hidden lg:flex relative w-1/2 flex-col justify-between overflow-hidden bg-[#071a2b]">
      {/* Layered gradient mesh */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 40%, rgba(8, 145, 178, 0.15) 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 80% 70%, rgba(34, 197, 94, 0.1) 0%, transparent 60%),
              radial-gradient(ellipse 40% 40% at 50% 20%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)
            `,
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 211, 238, 1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        <VitalParticle delay={0} x="15%" y="25%" size={60} />
        <VitalParticle delay={1.2} x="70%" y="15%" size={40} />
        <VitalParticle delay={0.6} x="45%" y="60%" size={50} />
        <VitalParticle delay={1.8} x="80%" y="45%" size={35} />
        <VitalParticle delay={2.4} x="25%" y="75%" size={45} />
        <VitalParticle delay={0.3} x="60%" y="80%" size={30} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center flex-1 px-12 xl:px-16">
        {/* Logo */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22D3EE] to-[#0891B2] flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white/90 tracking-tight">
              ED Guidelines
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Clinical protocols,{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #22D3EE 0%, #4ADE80 100%)",
              }}
            >
              instantly.
            </span>
          </h2>
          <p className="text-base text-white/50 leading-relaxed max-w-md">
            AI-powered guideline retrieval for Emergency Department clinicians.
            RCEM, NICE, and local trust protocols — at your fingertips.
          </p>
        </motion.div>

        {/* EKG animation */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <EkgLine />
        </motion.div>

        {/* Stats */}
        <motion.div
          className="mt-8 flex gap-10"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          {[
            { value: "500+", label: "Guidelines" },
            { value: "<2s", label: "Response" },
            { value: "24/7", label: "Available" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-xl font-bold text-[#22D3EE]">
                {stat.value}
              </div>
              <div className="text-xs text-white/40 uppercase tracking-wider mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom accent line */}
      <div className="relative z-10 h-1 w-full bg-gradient-to-r from-transparent via-[#22D3EE]/30 to-transparent" />
    </div>
  );
}

/* ─── OTP digit input ─── */
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, char: string) {
    if (!/^\d?$/.test(char)) return;
    const arr = value.split("");
    arr[index] = char;
    const next = arr.join("").slice(0, 6);
    onChange(next);
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    inputsRef.current[focusIdx]?.focus();
  }

  return (
    <div className="flex justify-center gap-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl border-2 border-border bg-background text-center text-xl font-bold text-foreground
            transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
            disabled:opacity-50"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

/* ─── Main page ─── */
function AuthPage() {
  const router = useRouter();

  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [error, setError] = React.useState("");

  const [isLoading, setIsLoading] = React.useState(false);
  const [isSocialLoading, setIsSocialLoading] = React.useState<
    "microsoft" | "google" | null
  >(null);

  const isAnyLoading = isLoading || !!isSocialLoading;

  /* ── Social sign-in ── */
  async function handleSocial(provider: "microsoft" | "google") {
    setError("");
    setIsSocialLoading(provider);
    try {
      await authClient.signIn.social({ provider, callbackURL: "/" });
    } catch {
      setError(
        `${provider === "microsoft" ? "Microsoft" : "Google"} sign-in failed.`,
      );
      setIsSocialLoading(null);
    }
  }

  /* ── Step 1: Email → send OTP ── */
  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      setStep("otp");
    } catch {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Step 2: OTP verification ── */
  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) return;
    setError("");
    setIsLoading(true);

    try {
      const { data, error: otpError } = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      if (otpError) {
        setError(otpError.message ?? "Invalid code. Please try again.");
        setIsLoading(false);
        return;
      }

      if (data) {
        router.navigate({ to: "/" });
      }
    } catch {
      setError("Verification failed. Please try again.");
      setIsLoading(false);
    }
  }

  /* ── Resend OTP ── */
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      setResendCooldown(60);
    } catch {
      setError("Failed to resend code.");
    }
  }

  function goBack() {
    setError("");
    setOtp("");
    setStep("email");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left: Brand panel (desktop) ── */}
      <BrandPanel />

      {/* ── Right: Auth form ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 sm:p-10 overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04]"
            style={{
              background:
                "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.03]"
            style={{
              background:
                "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </div>

        {/* Mobile logo (shown only on small screens) */}
        <motion.div
          className="lg:hidden mb-10 flex flex-col items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <svg
              className="w-6 h-6 text-primary-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">
            ED Guidelines
          </span>
        </motion.div>

        {/* Form container */}
        <motion.div
          className="relative z-10 w-full max-w-[400px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="mb-8">
            <motion.h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Welcome back
            </motion.h1>
            <AnimatePresence mode="wait">
              <motion.p
                key={step}
                className="mt-2 text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {step === "email" && "Sign in with your email to continue"}
                {step === "otp" && "Enter the verification code we sent you"}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive font-medium border border-destructive/20">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Steps */}
          <AnimatePresence mode="wait" initial={false}>
            {/* ─── EMAIL STEP ─── */}
            {step === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Social buttons first */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 text-sm font-semibold gap-2.5 rounded-xl group border-2 border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                    disabled={isAnyLoading}
                    onClick={() => handleSocial("google")}
                  >
                    {isSocialLoading === "google" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <GoogleIcon className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
                    )}
                    Google
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 text-sm font-semibold gap-2.5 rounded-xl group border-2 border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                    disabled={isAnyLoading}
                    onClick={() => handleSocial("microsoft")}
                  >
                    {isSocialLoading === "microsoft" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MicrosoftIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    )}
                    Microsoft
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold select-none">
                    or continue with email
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailContinue} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email-input"
                      className="block text-sm font-semibold text-foreground mb-2"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="email-input"
                        type="email"
                        placeholder="you@nhs.net"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                        disabled={isAnyLoading}
                        className="h-12 pl-10 text-base rounded-xl border-2 border-border/80 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold rounded-xl gap-2 group shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200"
                    disabled={isAnyLoading || !email}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Continue
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ─── OTP STEP ─── */}
            {step === "otp" && (
              <motion.form
                key="otp"
                onSubmit={handleOtpSubmit}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span className="font-medium">{email}</span>
                </button>

                <div className="text-center space-y-1">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-foreground">
                      {email}
                    </span>
                  </p>
                </div>

                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={isAnyLoading}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
                  disabled={isAnyLoading || otp.length < 6}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying
                    </span>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                <div className="flex items-center justify-center text-xs text-muted-foreground">
                  {resendCooldown > 0 ? (
                    <span className="font-medium text-muted-foreground/70">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            By continuing, you agree to our terms of service.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
