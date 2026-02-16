import { Link, useLocation } from "@tanstack/react-router";
import { 
  Search, 
  FolderOpen, 
  Settings, 
  LogOut, 
  Activity,
  Bell
} from "lucide-react";
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
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { label: "Search", icon: Search, href: "/search" },
  { label: "Browse", icon: FolderOpen, href: "/browse" },
] as const;

const adminNavItem = { label: "Admin", icon: Settings, href: "/admin" } as const;

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
    <div className="min-h-screen bg-[#F0FDFA] text-[#134E4A] relative overflow-x-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(8, 145, 178, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-[#99F6E4] bg-white/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          {/* Logo */}
          <Link to="/search" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] flex items-center justify-center shadow-lg shadow-[#0891B2]/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#134E4A] to-[#0891B2] bg-clip-text text-transparent">
              ED Guidelines
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-[#0891B2]/10 text-[#0891B2]" 
                      : "text-[#5E6B6A] hover:text-[#0891B2] hover:bg-[#0891B2]/5"
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20">
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-xs font-medium text-[#22C55E]">AI Active</span>
            </div>

            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative text-[#5E6B6A] hover:text-[#0891B2] hover:bg-[#0891B2]/10"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444]" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0 hover:bg-[#0891B2]/10"
                >
                  <Avatar className="h-9 w-9 border-2 border-[#0891B2]/20">
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-[#0891B2] to-[#22D3EE] text-white">
                      {user?.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-[#99F6E4] shadow-xl shadow-[#0891B2]/10">
                <div className="px-3 py-2 border-b border-[#99F6E4]">
                  <p className="text-sm font-semibold text-[#134E4A]">{user?.name || "User"}</p>
                  <p className="text-xs text-[#5E6B6A]">{user?.email || ""}</p>
                  {isAdmin && (
                    <Badge className="mt-1.5 bg-[#0891B2]/10 text-[#0891B2] border-[#0891B2]/20 text-[10px]">
                      Admin
                    </Badge>
                  )}
                </div>
                <DropdownMenuSeparator className="bg-[#99F6E4]" />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-[#EF4444] focus:text-[#EF4444] focus:bg-[#EF4444]/10">
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
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#99F6E4] bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-16 items-center justify-around gap-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-[#0891B2]/10 text-[#0891B2]" 
                    : "text-[#5E6B6A] hover:bg-[#0891B2]/5"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-[#0891B2]")} />
                <span className={cn("text-xs font-medium", isActive && "text-[#0891B2]")}>
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
