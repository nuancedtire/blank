import { Link, useLocation } from "@tanstack/react-router";
import { Search, FolderOpen, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Search", icon: Search, href: "/search" },
  { label: "Browse", icon: FolderOpen, href: "/browse" },
  { label: "Admin", icon: Settings, href: "/admin" },
] as const;

function handleSignOut() {
  authClient.signOut().then(() => {
    window.location.href = "/login";
  });
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, oklch(0.65 0.15 280 / 0.3) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'float 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full opacity-12"
          style={{
            background: 'radial-gradient(circle, oklch(0.78 0.12 45 / 0.3) 0%, transparent 70%)',
            filter: 'blur(70px)',
            animation: 'float 7s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Top header bar */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Logo / title */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent group-hover:scale-105 transition-transform">
              ED Guidelines
            </span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle variant="ghost" size="sm" className="hover:scale-105 transition-transform" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-full hover:scale-105 transition-transform"
                >
                  <Avatar className="h-9 w-9 clay-card">
                    <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      U
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 clay-card">
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer font-semibold">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex relative z-10">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border/50 md:bg-background/30 md:backdrop-blur-sm">
          <nav className="flex flex-col gap-3 p-4">
            {navItems.map((item, idx) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "animate-slide-in-right group",
                    idx === 0 && "stagger-1",
                    idx === 1 && "stagger-2",
                    idx === 2 && "stagger-3"
                  )}
                >
                  <div
                    className={cn(
                      "w-full flex items-center justify-start gap-3 h-12 px-4 font-semibold rounded-2xl transition-all cursor-pointer",
                      isActive &&
                        "clay-card bg-gradient-to-r from-primary/10 to-accent/10 text-primary",
                      !isActive && "clay-card hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 transition-transform", !isActive && "group-hover:scale-110")} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-h-[calc(100vh-4rem)] flex-1 pb-24 md:pb-0">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-16 items-center justify-around gap-2 px-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-muted-foreground rounded-2xl transition-all group",
                  isActive && "clay-card bg-gradient-to-b from-primary/10 to-accent/10 text-primary scale-105",
                  !isActive && "clay-card hover:bg-gradient-to-b hover:from-muted/50 hover:to-muted/30"
                )}
              >
                <item.icon
                  className={cn("h-6 w-6 transition-transform", isActive && "text-primary", !isActive && "group-hover:scale-110")}
                />
                <span
                  className={cn(
                    "text-xs leading-tight font-semibold",
                    isActive && "text-primary"
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
