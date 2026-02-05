"use client";

import * as React from "react";
import { Bell, User, ChevronDown, LogOut, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
  className?: string;
}

export function Header({ title = "App Name", className }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card px-4 md:px-6",
        className
      )}
    >
      {/* App Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden md:inline-block">John Doe</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isUserMenuOpen && "rotate-180"
              )}
            />
          </Button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border bg-card shadow-lg">
              <div className="p-2">
                <div className="px-2 py-1.5 text-sm font-medium">
                  John Doe
                </div>
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  john.doe@example.com
                </div>
              </div>
              <div className="border-t" />
              <div className="p-1">
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
