'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backHref?: string;
  hideBack?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
  backHref,
  hideBack,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className={cn('space-y-3', className)}>
      {!hideBack && (
        <button
          type="button"
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}

      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {idx > 0 && <span className="text-gray-400">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
        {action && <div className="w-full sm:w-auto">{action}</div>}
      </div>
    </div>
  );
}
