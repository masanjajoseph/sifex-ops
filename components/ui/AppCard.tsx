'use client';

import { cn } from '@/lib/utils';

interface AppCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  category: string;
  status?: 'active' | 'inactive' | 'beta';
  lastAccessed?: Date;
  onClick?: () => void;
  className?: string;
}

export function AppCard({
  icon: Icon,
  title,
  description,
  category,
  status = 'active',
  lastAccessed,
  onClick,
  className,
}: AppCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    beta: 'bg-blue-100 text-blue-800',
  };

  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Open ${title}`}
      className={cn(
        'group relative flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all duration-200 hover:border-blue-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600',
        className
      )}
    >
      {/* Icon */}
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 dark:bg-blue-900/30 dark:group-hover:bg-blue-900/50">
          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        {status !== 'active' && (
          <span className={cn('rounded-full px-2 py-1 text-xs font-medium', statusColors[status])}>
            {status}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{category}</span>
        {lastAccessed && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatLastAccessed(lastAccessed)}
          </span>
        )}
      </div>
    </button>
  );
}

function formatLastAccessed(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
