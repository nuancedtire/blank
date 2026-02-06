import { Link } from "@tanstack/react-router";
import { FileText, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
}

const sourceColors: Record<string, string> = {
  local: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rcem: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  nice: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

export function GuidelineCard({
  slug,
  title,
  category,
  source,
  summary,
  version,
  lastUpdated,
  compact = false,
}: GuidelineCardProps) {
  return (
    <Link
      to="/guideline/$slug"
      params={{ slug }}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5">
        <FileText className="h-5 w-5 text-primary/70" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm leading-tight truncate">{title}</h3>
        {!compact && summary && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {summary}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", sourceColors[source])}
          >
            {source.toUpperCase()}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            v{version}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
