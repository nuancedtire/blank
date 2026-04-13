import { Link, useLocation } from "@tanstack/react-router";
import {
  Search,
  FolderOpen,
  History,
  Settings,
  LogOut,
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  Megaphone,
  X,
  Languages,
  HeartPulse,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { AideLogo } from "@/components/ui/aide-logo";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const coreNavItems = [
  { label: "Search", icon: Search, href: "/search" },
  { label: "Browse", icon: FolderOpen, href: "/browse" },
  { label: "History", icon: History, href: "/history" },
] as const;

const featureNavItems = {
  interpreter: { label: "Interpreter", icon: Languages, href: "/interpreter" },
  mentalHealth: { label: "Mental Health", icon: HeartPulse, href: "/mental-health" },
} as const;

const adminNavItem = {
  label: "Admin",
  icon: Settings,
  href: "/admin",
} as const;

function handleSignOut() {
  authClient.signOut().then(() => {
    window.location.href = "/login";
  });
}

function notificationIcon(type: "info" | "warning" | "success" | "alert") {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "warning":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    case "alert":
      return <Megaphone className="h-3.5 w-3.5 text-rose-500" />;
    default:
      return <Info className="h-3.5 w-3.5 text-sky-500" />;
  }
}

function aiBadgeClasses(state?: string) {
  switch (state) {
    case "active":
      return {
        wrap: "bg-emerald-500/10 border-emerald-500/25",
        dot: "bg-emerald-500 animate-pulse",
        text: "text-emerald-600 dark:text-emerald-400",
      };
    case "out_of_credits":
      return {
        wrap: "bg-rose-500/10 border-rose-500/25",
        dot: "bg-rose-500",
        text: "text-rose-600 dark:text-rose-400",
      };
    case "not_configured":
      return {
        wrap: "bg-amber-500/10 border-amber-500/25",
        dot: "bg-amber-500",
        text: "text-amber-600 dark:text-amber-400",
      };
    case "degraded":
      return {
        wrap: "bg-orange-500/10 border-orange-500/25",
        dot: "bg-orange-500",
        text: "text-orange-600 dark:text-orange-400",
      };
    default:
      return {
        wrap: "bg-muted border-border",
        dot: "bg-muted-foreground/60 animate-pulse",
        text: "text-muted-foreground",
      };
  }
}

function NotificationList({ onClose }: { onClose?: () => void }) {
  const { data: notifications } = useQuery(
    convexQuery(api.notifications.list, { limit: 20 }),
  );
  const markAsRead = useConvexMutation(api.notifications.markAsRead);
  const markAllAsRead = useConvexMutation(api.notifications.markAllAsRead);
  const dismiss = useConvexMutation(api.notifications.dismiss);

  const markOneMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markAsRead({ notificationId: notificationId as any }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllAsRead({}),
  });

  const dismissMutation = useMutation({
    mutationFn: (notificationId: string) =>
      dismiss({ notificationId: notificationId as any }),
  });

  const handleOpen = async (notification: any) => {
    if (!notification.isRead) {
      await markOneMutation.mutateAsync(notification._id);
    }

    if (notification.link) {
      window.location.href = notification.link;
      onClose?.();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-semibold">Notifications</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || !notifications?.length}
        >
          Mark all read
        </Button>
      </div>

      <ScrollArea className="h-[420px] md:h-[420px]">
        <div className="divide-y">
          {notifications?.map((n: any) => (
            <div
              key={n._id}
              className="group px-4 py-3 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">{notificationIcon(n.type)}</div>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => handleOpen(n)}
                >
                  <div className="flex items-center gap-1.5">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        !n.isRead && "text-foreground",
                      )}
                    >
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("en-GB")}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => dismissMutation.mutate(n._id)}
                  title="Dismiss"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {(!notifications || notifications.length === 0) && (
            <div className="px-4 py-12 text-center text-muted-foreground">
              <Bell className="mx-auto mb-3 h-7 w-7 opacity-30" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs mt-1">
                Admin alerts and updates appear here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function NotificationCenter() {
  const { data: unreadCount } = useQuery(
    convexQuery(api.notifications.getUnreadCount, {}),
  );
  const count = unreadCount ?? 0;
  const badgeText = count > 99 ? "99+" : String(count);

  return (
    <>
      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Bell className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground grid place-items-center">
                  {badgeText}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[380px] p-0">
            <NotificationList />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Bell className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground grid place-items-center">
                  {badgeText}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] sm:max-w-sm p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>Recent activity and alerts</SheetDescription>
            </SheetHeader>
            <NotificationList />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { data: user } = useQuery(convexQuery(api.users.me, {}));
  const { data: aiStatus } = useQuery(
    convexQuery((api as any).agentActions.getAiRuntimeStatus, {}),
  );
  const { data: mhAlerts = [] } = useQuery(
    convexQuery(api.mentalHealth.alerts.listActiveAlerts, {}),
  );
  const { data: featureFlags } = useQuery(
    convexQuery(api.siteSettings.getFeatureFlags, {}),
  );
  const mhAlertCount = (mhAlerts as any[]).length;
  const isAdmin = user?.role === "admin";

  // Build nav items based on feature flags
  const navItems = [
    ...coreNavItems,
    ...(featureFlags?.interpreterEnabled ? [featureNavItems.interpreter] : []),
    ...(featureFlags?.mentalHealthEnabled ? [featureNavItems.mentalHealth] : []),
    ...(isAdmin ? [adminNavItem] : []),
  ];
  const badgeStyles = aiBadgeClasses(aiStatus?.state);
  const badgeLabel = aiStatus?.label ?? "Checking AI";
  const badgeTitle = aiStatus?.detail ?? "Checking assistant runtime health.";

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(0.65 0.15 195 / 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.17 155 / 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          <Link
            to="/search"
            search={{ threadId: undefined }}
            className="flex items-center"
          >
            <AideLogo size="md" animate="hover" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const isMentalHealth = item.href === "/mental-health";
              const showAlertBadge = isMentalHealth && mhAlertCount > 0;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {showAlertBadge && (
                    <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white grid place-items-center animate-pulse">
                      {mhAlertCount > 9 ? "9+" : mhAlertCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div
              title={badgeTitle}
              className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border",
                badgeStyles.wrap,
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", badgeStyles.dot)} />
              <span className={cn("text-xs font-medium", badgeStyles.text)}>
                {badgeLabel}
              </span>
            </div>

            <ThemeToggle variant="ghost" size="sm" />
            <NotificationCenter />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0 hover:bg-primary/10"
                >
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                      {user?.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-popover border-border shadow-xl shadow-primary/10"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email || ""}
                  </p>
                  {isAdmin && (
                    <Badge className="mt-1.5 bg-primary/10 text-primary border-primary/20 text-[10px]">
                      Admin
                    </Badge>
                  )}
                </div>
                <DropdownMenuSeparator className="bg-border" />
                <Link to="/settings">
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="relative z-10 min-h-[calc(100vh-4rem)] pb-20 md:pb-8">
        <div className="max-w-8xl mx-auto p-4 lg:p-8">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-16 items-center justify-around gap-1 px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const isMentalHealth = item.href === "/mental-health";
            const showAlertBadge = isMentalHealth && mhAlertCount > 0;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-primary/5",
                )}
              >
                <div className="relative">
                  <item.icon
                    className={cn("w-5 h-5", isActive && "text-primary")}
                  />
                  {showAlertBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-[9px] font-bold text-white grid place-items-center animate-pulse">
                      {mhAlertCount > 9 ? "9+" : mhAlertCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive && "text-primary",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
