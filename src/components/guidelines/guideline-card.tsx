import { Link } from "@tanstack/react-router";
import { FileText, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardInteractive } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GuidelineCardProps {
  slug: string;
  title: string;
  category: string;
  source: "local" | "rcem" | "nice";
  summary?: string;
  version: string;
  lastUpdated: number;
  compact?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

const sourceColors: Record<string, string> = {
  local: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rcem: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  nice: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
};

export function GuidelineCard({
  slug,
  title,
  source,
  summary,
  version,
  compact = false,
  isPinned,
  onTogglePin,
}: GuidelineCardProps) {
  return (
    <CardInteractive className="p-0 group">
      <Link
        to="/guideline/$slug"
        params={{ slug }}
        className="flex items-center gap-4 p-4"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all">
          <FileText className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors">{title}</h3>
          {!compact && summary && (
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1 font-light">
              {summary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold border", sourceColors[source])}
            >
              {source.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground font-light">
              v{version}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onTogglePin && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePin();
              }}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  isPinned
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </Button>
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </Link>
    </CardInteractive>
  );
}
