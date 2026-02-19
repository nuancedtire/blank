import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Ban, ShieldCheck, ShieldOff, UserCheck, Users } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { toast } = useToast();
  const { data: users } = useQuery(convexQuery(api.users.listAll, {}));
  const { data: me } = useQuery(convexQuery(api.users.me, {}));
  const updateRole = useConvexMutation(api.users.updateRole);
  const setBanStatus = useConvexMutation(api.users.setBanStatus);
  const [banReasonByUser, setBanReasonByUser] = React.useState<Record<string, string>>({});

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: "user" | "admin" }) =>
      updateRole({ userId: input.userId as any, role: input.role }),
    onSuccess: () => toast({ title: "Role updated" }),
    onError: (error: any) =>
      toast({
        title: "Could not update role",
        description: error.message,
        variant: "destructive",
      }),
  });

  const banMutation = useMutation({
    mutationFn: (input: { userId: string; isBanned: boolean; reason?: string }) =>
      setBanStatus({
        userId: input.userId as any,
        isBanned: input.isBanned,
        reason: input.reason,
      }),
    onSuccess: () => toast({ title: "User status updated" }),
    onError: (error: any) =>
      toast({
        title: "Could not update user",
        description: error.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles and account status
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {users?.map((user: any) => {
          const isSelf = Boolean(me?._id && String(me._id) === String(user._id));
          const pending = roleMutation.isPending || banMutation.isPending;
          const nextRole = user.role === "admin" ? "user" : "admin";

          return (
            <div key={user._id} className="p-3 sm:p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                  {user.isBanned && <Badge variant="destructive">banned</Badge>}
                  {isSelf && <Badge variant="outline">you</Badge>}
                </div>
              </div>

              {user.isBanned && user.bannedReason && (
                <p className="text-xs text-muted-foreground">
                  Ban reason: {user.bannedReason}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || isSelf}
                  onClick={() =>
                    roleMutation.mutate({ userId: user._id, role: nextRole })
                  }
                  className="gap-1.5"
                >
                  {nextRole === "admin" ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldOff className="h-3.5 w-3.5" />
                  )}
                  Make {nextRole}
                </Button>

                {user.isBanned ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || isSelf}
                    onClick={() =>
                      banMutation.mutate({ userId: user._id, isBanned: false })
                    }
                    className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Unban
                  </Button>
                ) : (
                  <>
                    <Input
                      placeholder="Ban reason (optional)"
                      className="h-8 text-xs max-w-56"
                      value={banReasonByUser[user._id] ?? ""}
                      onChange={(e) =>
                        setBanReasonByUser((prev) => ({
                          ...prev,
                          [user._id]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || isSelf}
                      onClick={() =>
                        banMutation.mutate({
                          userId: user._id,
                          isBanned: true,
                          reason: banReasonByUser[user._id],
                        })
                      }
                      className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Ban
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {(!users || users.length === 0) && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
