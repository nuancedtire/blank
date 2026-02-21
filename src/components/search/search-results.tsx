import { Link } from "@tanstack/react-router";
import { FileText, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardInteractive } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface GuidelineResult {
  _id: string;
  title: string;
  slug: string;
  category: string;
  summary?: string;
  source: string;
  version: string;
  lastUpdated: number;
}

interface SearchResultsProps {
  results: GuidelineResult[];
  query: string;
  isLoading?: boolean;
  onPin?: (id: string) => void;
  pinnedIds?: string[];
}

const sourceLabels: Record<string, { label: string; className: string }> = {
  local: {
    label: "Local",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  legacy: {
    label: "Legacy",
    className: "bg-muted text-muted-foreground",
  },
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SearchResults({
  results,
  query,
  isLoading,
  onPin,
  pinnedIds = [],
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">
          No guidelines found for &ldquo;{query}&rdquo;
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try different search terms or browse by category
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {query && (
        <p className="text-sm text-muted-foreground px-1">
          {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;
          {query}&rdquo;
        </p>
      )}
      {results.map((result) => {
        const source = sourceLabels[result.source] ?? sourceLabels.legacy;
        const isPinned = pinnedIds.includes(result._id);

        return (
          <CardInteractive key={result._id} className="p-0">
            <Link
              to="/guideline/$slug"
              params={{ slug: result.slug }}
              className="block p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn("text-xs", source?.className)}>
                      {source?.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {result.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      v{result.version}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm leading-tight">
                    {result.title}
                  </h3>
                  {result.summary && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {result.summary}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1.5">
                    Updated {formatDate(result.lastUpdated)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onPin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPin(result._id);
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          </CardInteractive>
        );
      })}
    </div>
  );
}
