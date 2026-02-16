import { Link, useLocation } from "@tanstack/react-router";
import { Search, FolderOpen, Settings, LogOut, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
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

const baseNavItems = [
  { label: "Search", icon: Search, href: "/search" },
  { label: "Browse", icon: FolderOpen, href: "/browse" },
] as const;

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { data: user } = useQuery(convexQuery(api.users.me, {}));
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Background Decorations */}
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

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          {/* Logo */}
          <Link to="/search" className="flex items-center">
            <AideLogo size="md" animate="hover" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* AI Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium text-accent">AI Active</span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle variant="ghost" size="sm" />

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
            </Button>

            {/* User Menu */}
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

      {/* Main Content Area */}
      <main className="relative z-10 min-h-[calc(100vh-4rem)] pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-16 items-center justify-around gap-1 px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-primary/5",
                )}
              >
                <item.icon
                  className={cn("w-5 h-5", isActive && "text-primary")}
                />
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
