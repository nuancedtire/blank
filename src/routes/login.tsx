import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  Loader2,
  ArrowLeft,
  Mail,
  Lock,
  KeyRound,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/login")({
  component: AuthPage,
});

type Step = "email" | "password" | "otp";

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

/* ─── Decorative pulse ring behind the logo ─── */
function PulseRing() {
  return (
    <motion.span
      className="absolute inset-0 rounded-2xl border-2 border-primary/30"
      animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
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
  const [password, setPassword] = React.useState("");
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

  /* ── Step 1: Email → go to password step ── */
  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("password");
  }

  /* ── Step 2a: Password sign-in (default) ── */
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message ?? "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (data) {
        router.navigate({ to: "/" });
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  /* ── Step 2b: OTP verification (primary flow for all users) ── */
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

  /* ── Switch between OTP and password ── */
  function switchToPassword() {
    setError("");
    setOtp("");
    setStep("password");
  }

  async function switchToOtp() {
    setError("");
    setPassword("");
    setIsLoading(true);
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      setStep("otp");
    } catch {
      setError("Failed to send code. Please try again.");
    } finally {
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
    setPassword("");
    setOtp("");
    setStep("email");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* ── Ambient background blobs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-20 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{
            background:
              "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
          animate={{ x: [0, -25, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ── Card ── */}
      <motion.div
        className="relative z-10 w-full max-w-[400px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Glass card */}
        <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-xl overflow-hidden">
          {/* ── Header ── */}
          <div className="px-6 pt-8 pb-2 text-center">
            {/* Logo mark */}
            <div className="relative mx-auto w-14 h-14 mb-5">
              <PulseRing />
              <motion.div
                className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
              >
                <svg
                  className="w-7 h-7 text-primary-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </motion.div>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              ED Guidelines
            </h1>
            <AnimatePresence mode="wait">
              <motion.p
                key={step}
                className="mt-1 text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {step === "email" && "Enter your email to get started"}
                {step === "password" && "Sign in to access protocols"}
                {step === "otp" && "Check your inbox for a verification code"}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* ── Error ── */}
          <div className="px-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive font-medium border border-destructive/20">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Steps ── */}
          <div className="px-6 pt-5 pb-6">
            <AnimatePresence mode="wait" initial={false}>
              {/* ─── EMAIL STEP ─── */}
              {step === "email" && (
                <motion.form
                  key="email"
                  onSubmit={handleEmailContinue}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      disabled={isAnyLoading}
                      className="h-12 pl-10 text-base rounded-xl border-2 border-border/80 transition-colors focus:border-primary"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold rounded-xl gap-2 group"
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
                </motion.form>
              )}

              {/* ─── PASSWORD STEP ─── */}
              {step === "password" && (
                <motion.form
                  key="password"
                  onSubmit={handlePasswordSubmit}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  {/* Show email chip */}
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    <span className="font-medium">{email}</span>
                  </button>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      autoFocus
                      disabled={isAnyLoading}
                      className="h-12 pl-10 text-base rounded-xl border-2 border-border/80 transition-colors focus:border-primary"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold rounded-xl"
                    disabled={isAnyLoading || !password}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    No password?{" "}
                    <button
                      type="button"
                      onClick={switchToOtp}
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      Sign in with email code
                    </button>
                  </p>
                </motion.form>
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
                    <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
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
                    className="w-full h-12 text-base font-bold rounded-xl"
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

                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
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
                    <span className="text-border">|</span>
                    <button
                      type="button"
                      onClick={switchToPassword}
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      Use password instead
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* ── Divider + Social ── */}
          <div className="px-6 pb-7">
            <div className="relative flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold select-none">
                or
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 text-sm font-semibold gap-2 rounded-xl group"
                disabled={isAnyLoading}
                onClick={() => handleSocial("google")}
              >
                {isSocialLoading === "google" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GoogleIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                )}
                Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 text-sm font-semibold gap-2 rounded-xl group"
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
          </div>
        </div>

        {/* ── Footer ── */}
        <p className="mt-5 text-center text-xs text-muted-foreground/70">
          By continuing, you agree to our terms of service.
        </p>
      </motion.div>
    </div>
  );
}
