import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const ensureProfile = useConvexMutation(api.users.ensureProfile);
  const profileMutation = useMutation({
    mutationFn: () => ensureProfile({}),
  });
  const calledRef = useRef(false);

  useEffect(() => {
    if (!calledRef.current) {
      calledRef.current = true;
      profileMutation.mutate();
    }
  }, []);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
