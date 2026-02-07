import * as React from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
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

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

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
      {/* Minimal Background Orb */}
      <div className="absolute inset-0">
        <div
          className="absolute top-1/3 -left-12 w-48 h-48 sm:w-60 sm:h-60 rounded-full opacity-14"
          style={{
            background: 'radial-gradient(circle, oklch(0.55 0.18 30 / 0.4) 0%, transparent 60%)',
            filter: 'blur(35px)',
            animation: 'float 5s ease-in-out infinite',
          }}
        />
      </div>

      <Card className="relative z-10 w-full max-w-md clay-card backdrop-blur-sm bg-card/98">
        <CardHeader className="text-center space-y-2 pb-3 px-4 sm:px-6 pt-5">
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
            ED Guidelines
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm font-light">
            Sign in to access protocols
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 px-4 sm:px-6">
            {error && (
              <div className="clay-card rounded-xl bg-destructive/15 px-3.5 py-2.5 text-xs sm:text-sm text-destructive font-bold border border-destructive/25">
                {error}
              </div>
            )}

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
                disabled={isLoading}
                className="clay-input h-10 sm:h-11 text-sm sm:text-base"
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
                disabled={isLoading}
                className="clay-input h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2.5 pt-1 px-4 sm:px-6 pb-5">
            <Button
              type="submit"
              className="clay-button w-full h-10 sm:h-11 text-sm sm:text-base font-bold tracking-wide"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-bold text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
