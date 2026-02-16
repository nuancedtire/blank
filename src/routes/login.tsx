import * as React from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-card/90 backdrop-blur-sm rounded-lg"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Animated Logo */}
        <div className="relative">
          <motion.div
            className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.svg
              className="w-8 h-8 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </motion.svg>
          </motion.div>
          {/* Orbiting dot */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full shadow-lg" />
          </motion.div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-1">
          <motion.p
            className="text-lg font-semibold text-foreground"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {message}
          </motion.p>
          <p className="text-xs text-muted-foreground">Please wait...</p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isMsLoading, setIsMsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const isAnyLoading = isLoading || isMsLoading || isGoogleLoading;

  async function handleMicrosoftSignIn() {
    setError("");
    setIsMsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "microsoft",
        callbackURL: "/",
      });
    } catch {
      setError("Microsoft sign-in failed. Please try again.");
      setIsMsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setIsGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <div className="relative min-h-screen flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/3 -left-12 w-48 h-48 sm:w-60 sm:h-60 rounded-full opacity-14"
          style={{
            background: 'radial-gradient(circle, oklch(0.55 0.18 30 / 0.4) 0%, transparent 60%)',
            filter: 'blur(35px)',
          }}
          animate={{
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, oklch(0.65 0.15 195 / 0.3) 0%, transparent 60%)',
            filter: 'blur(45px)',
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <Card className="relative z-10 w-full max-w-md backdrop-blur-sm bg-card/98 overflow-hidden">
        <AnimatePresence>
          {isAnyLoading && (
            <LoadingOverlay 
              message={isLoading ? "Signing in" : isMsLoading ? "Connecting to Microsoft" : "Connecting to Google"} 
            />
          )}
        </AnimatePresence>

        <CardHeader className="text-center space-y-2 px-4 sm:px-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              ED Guidelines
            </CardTitle>
          </motion.div>
          <CardDescription className="text-xs sm:text-sm font-light">
            Sign in to access protocols
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 px-4 sm:px-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="rounded-xl bg-destructive/15 px-3.5 py-2.5 text-xs sm:text-sm text-destructive font-bold border border-destructive/25"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isAnyLoading}
                className="h-10 sm:h-11 text-sm sm:text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wide">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isAnyLoading}
                className="h-10 sm:h-11 text-sm sm:text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2.5 pt-4 px-4 sm:px-6">
            <Button
              type="submit"
              className="w-full h-10 sm:h-11 text-sm sm:text-base font-bold tracking-wide relative overflow-hidden"
              disabled={isAnyLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="relative w-full flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-10 sm:h-11 text-sm sm:text-base font-semibold gap-2.5 relative overflow-hidden group"
              disabled={isAnyLoading}
              onClick={handleMicrosoftSignIn}
            >
              <MicrosoftIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
              {isMsLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </span>
              ) : (
                "Sign in with Microsoft"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-10 sm:h-11 text-sm sm:text-base font-semibold gap-2.5 relative overflow-hidden group"
              disabled={isAnyLoading}
              onClick={handleGoogleSignIn}
            >
              <GoogleIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
              {isGoogleLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </span>
              ) : (
                "Sign in with Google"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Don't have an account?{" "}
              <Link to="/signup" className="font-bold text-primary hover:underline transition-colors">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
