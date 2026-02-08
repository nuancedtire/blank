import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GuidelineCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-4 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
            <Skeleton className="h-5 w-5 rounded shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function CategoryCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-3 py-3 sm:p-4 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-5 rounded shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}
