import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/search" });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Animated Background - Fewer, tighter orbs */}
      <div className="absolute inset-0">
        <div
          className="absolute top-0 left-1/4 w-56 h-56 sm:w-72 sm:h-72 rounded-full opacity-18"
          style={{
            background: 'radial-gradient(circle, oklch(0.55 0.18 30 / 0.4) 0%, transparent 60%)',
            filter: 'blur(40px)',
            animation: 'float 5s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-1/4 right-0 w-64 h-64 sm:w-80 sm:h-80 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, oklch(0.68 0.14 50 / 0.35) 0%, transparent 60%)',
            filter: 'blur(45px)',
            animation: 'float 6s ease-in-out infinite',
            animationDelay: '1s',
          }}
        />
      </div>

      {/* Main Content - Compact mobile-first */}
      <Card className="relative z-10 w-full max-w-md clay-card backdrop-blur-sm bg-card/98 animate-fade-in-up stagger-1">
        <CardHeader className="text-center space-y-2.5 pb-4 px-4 sm:px-6">
          <CardTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-primary via-accent to-secondary bg-clip-text text-transparent leading-[1.15]">
            ED Guidelines
          </CardTitle>
          <CardDescription className="text-sm sm:text-base leading-snug font-light">
            Instant AI access to emergency protocols. Local trust, RCEM, NICE.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-2.5 px-4 sm:px-6 pb-5">
          <Button asChild className="clay-button h-11 text-base font-bold tracking-wide">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 text-base font-bold tracking-wide clay-card border-2"
          >
            <Link to="/signup">Sign Up</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
