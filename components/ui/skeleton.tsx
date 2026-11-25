import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-blue rounded-[var(--radius-md)] ${className}`}
    />
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-blue-100 bg-white p-5 shadow-[var(--shadow-xs)] space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-2 flex-1">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4 max-w-xs" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
