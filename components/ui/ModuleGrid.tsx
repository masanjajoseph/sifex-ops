'use client';

import { cn } from '@/lib/utils';

interface ModuleGridProps {
  children: React.ReactNode;
  columns?: number;
  className?: string;
}

export function ModuleGrid({
  children,
  columns = 4,
  className,
}: ModuleGridProps) {
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }[columns] || 'grid-cols-4';

  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:' + gridColsClass,
        className
      )}
    >
      {children}
    </div>
  );
}
