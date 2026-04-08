import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Activity, Plus, Upload, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: guidelines } = useQuery(
    convexQuery(api.guidelines.listAllSummaries, {}),
  );
  const { data: users } = useQuery(convexQuery(api.users.listAll, {}));
  const { data: auditLogs } = useQuery(
    convexQuery(api.auditLog.getRecent, { limit: 10 }),
  );

  const stats = {
    totalGuidelines: guidelines?.length ?? 0,
    published:
      guidelines?.filter((g: any) => g.status === "published").length ?? 0,
    drafts: guidelines?.filter((g: any) => g.status === "draft").length ?? 0,
    totalUsers: users?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage content, users, notifications, and view activity
          </p>
        </div>
        <Link to="/admin/guidelines">
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            New Guideline
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="py-3 gap-2">
          <CardHeader className="px-4 pb-0">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Published
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <p className="text-2xl font-bold">{stats.published}</p>
          </CardContent>
        </Card>

        <Card className="py-3 gap-2">
          <CardHeader className="px-4 pb-0">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Drafts
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <p className="text-2xl font-bold">{stats.drafts}</p>
          </CardContent>
        </Card>

        <Card className="py-3 gap-2">
          <CardHeader className="px-4 pb-0">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              Users
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
          </CardContent>
        </Card>

        <Card className="py-3 gap-2">
          <CardHeader className="px-4 pb-0">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5" />
              Total Guidelines
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <p className="text-2xl font-bold">{stats.totalGuidelines}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium mb-2">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link to="/admin/guidelines">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Manage Guidelines
                </CardTitle>
                <CardDescription className="text-xs">
                  Add, edit, or archive guidelines
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/documents">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Documents
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload PDFs and text files for RAG search
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/notifications">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-xs">
                  Send notifications to users
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/users">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  User Management
                </CardTitle>
                <CardDescription className="text-xs">
                  Ban/unban users and manage admin access
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium mb-2">Recent Activity</h2>
        <div className="rounded-lg border bg-card divide-y">
          {auditLogs?.map((log: any) => (
            <div key={log._id} className="p-3 flex items-start gap-2">
              <Activity className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs">{log.details ?? log.action}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(log.timestamp).toLocaleString("en-GB")}
                </p>
              </div>
            </div>
          ))}
          {(!auditLogs || auditLogs.length === 0) && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
