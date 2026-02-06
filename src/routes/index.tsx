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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">
            ED Guidelines Assistant
          </CardTitle>
          <CardDescription className="text-base">
            Instant, AI-powered access to emergency department guidelines.
            Search local trust protocols, RCEM standards, and NICE guidance
            in seconds.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
