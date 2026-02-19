import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authed/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { data: me, isLoading } = useQuery(convexQuery(api.users.me, {}));

  if (isLoading) {
    return <div className="py-10 text-sm text-muted-foreground">Checking admin access...</div>;
  }

  if (!me || me.role !== "admin") {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <p className="font-semibold">Admin access required</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have permission to access this section.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
