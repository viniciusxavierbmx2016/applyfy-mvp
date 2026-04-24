import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800/60",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonCourseCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
      <div className="aspect-video bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
        <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800/60 animate-pulse mt-4" />
      </div>
    </div>
  );
}

export function SkeletonBanner() {
  return (
    <div className="w-full animate-pulse bg-gray-200 dark:bg-gray-800/40" style={{ aspectRatio: "24/5" }} />
  );
}

export function SkeletonFilters() {
  return (
    <div className="space-y-3">
      <div className="h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-800/40 animate-pulse" />
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-full bg-gray-200 dark:bg-gray-800/40 animate-pulse" />
        <div className="h-8 w-24 rounded-full bg-gray-200 dark:bg-gray-800/40 animate-pulse" />
        <div className="h-8 w-20 rounded-full bg-gray-200 dark:bg-gray-800/40 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonModuleCarousel() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[220px]">
            <div className="aspect-[9/16] rounded-xl bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
            <div className="mt-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
            <div className="mt-1 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPlayer() {
  return (
    <div className="space-y-4">
      <div className="aspect-video rounded-xl bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
      <div className="h-6 w-2/3 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
      <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
    </div>
  );
}

export function SkeletonLessonsSidebar() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800/40 animate-pulse ml-3" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonLiveCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
      </div>
      <div className="h-5 w-2/3 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
      <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
      <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-800/60 animate-pulse" />
    </div>
  );
}
