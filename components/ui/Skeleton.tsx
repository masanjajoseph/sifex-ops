'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700',
        className
      )}
    />
  );
}

interface SkeletonLineProps {
  count?: number;
  className?: string;
}

export function SkeletonLine({ count = 1, className }: SkeletonLineProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4 w-full', className)} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <Skeleton className="mb-4 h-6 w-1/3" />
      <SkeletonLine count={3} className="h-4" />
    </div>
  );
}
