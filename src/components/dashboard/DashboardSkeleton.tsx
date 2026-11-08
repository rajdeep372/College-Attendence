import React from "react";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Profile Skeleton */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="w-40 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="w-24 h-4 bg-slate-200/80 dark:bg-slate-800/60 rounded-md" />
          </div>
        </div>
        <div className="w-32 h-8 bg-slate-200 dark:bg-slate-800/80 rounded-full" />
      </div>

      {/* Banner Skeleton */}
      <div className="h-40 rounded-3xl glass-card border border-slate-200/80 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40" />

      {/* 4 Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl glass-card border border-slate-200/80 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40" />
        ))}
      </div>
    </div>
  );
}

