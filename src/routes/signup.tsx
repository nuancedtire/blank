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

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (signUpError) {
        setError(signUpError.message ?? "Unable to create account.");
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
          className="absolute bottom-1/3 -right-12 w-52 h-52 sm:w-64 sm:h-64 rounded-full opacity-13"
          style={{
            background: 'radial-gradient(circle, oklch(0.68 0.14 50 / 0.35) 0%, transparent 60%)',
            filter: 'blur(38px)',
            animation: 'float 5.5s ease-in-out infinite',
          }}
        />
      </div>

      <Card className="relative z-10 w-full max-w-md backdrop-blur-sm bg-card/98">
        <CardHeader className="text-center space-y-2 px-4 sm:px-6">
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-br from-accent via-primary to-secondary bg-clip-text text-transparent">
            ED Guidelines
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm font-light">
            Create account for protocol access
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 px-4 sm:px-6">
            {error && (
              <div className="rounded-xl bg-destructive/15 px-3.5 py-2.5 text-xs sm:text-sm text-destructive font-bold border border-destructive/25 shadow-[var(--clay-shadow-sm)]">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wide">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                disabled={isLoading}
                className="clay-input h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

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
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isLoading}
                className="clay-input h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2.5 pt-4 px-4 sm:px-6">
            <Button
              type="submit"
              className="w-full h-10 sm:h-11 text-sm sm:text-base font-bold tracking-wide"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
