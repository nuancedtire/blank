import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useConvexAuth } from "convex/react";
import { api } from "convex/_generated/api";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureProfile = useConvexMutation(api.users.ensureProfile);
  const { data: me } = useQuery({
    ...convexQuery(api.users.me, {}),
    enabled: isAuthenticated,
  });
  const profileMutation = useMutation({
    mutationFn: () => ensureProfile({}),
  });
  const calledRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const profileMissing =
      me !== undefined && (me === null || me?._id === null);
    if (!calledRef.current || profileMissing) {
      calledRef.current = true;
      if (!profileMutation.isPending) {
        profileMutation.mutate();
      }
    }
  }, [isAuthenticated, isLoading, me?._id, profileMutation.isPending]);

  useEffect(() => {
    if (me?.isBanned) {
      authClient.signOut().finally(() => {
        window.location.href = "/login?reason=banned";
      });
    }
  }, [me?.isBanned]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
