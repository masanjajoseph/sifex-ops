'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton';

interface ModulePageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backHref?: string;
  children?: React.ReactNode;
}

export function ModulePage({
  title,
  description,
  icon,
  action,
  breadcrumbs,
  backHref,
  children,
}: ModulePageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={action}
        breadcrumbs={breadcrumbs}
        backHref={backHref}
      />
      {children ? (
        children
      ) : (
        <EmptyState
          icon={icon}
          title={`No ${title} data available`}
          description="This module is ready for use. Data will appear here once operations begin."
        />
      )}
    </div>
  );
}

export function ModulePageLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="p-6">
          <SkeletonLine count={5} />
        </div>
      </div>
    </div>
  );
}
