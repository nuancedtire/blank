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
    <div className="min-h-screen bg-background text-foreground">
      {/* Top header bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo / title */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">
              ED Guidelines
            </span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle variant="ghost" size="sm" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs font-medium">
                      U
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-background">
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 font-normal",
                      isActive &&
                        "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-h-[calc(100vh-3.5rem)] flex-1 pb-20 md:pb-0">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-14 items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-muted-foreground",
                  isActive && "text-foreground"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", isActive && "text-foreground")}
                />
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    isActive && "font-medium"
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
