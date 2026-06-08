'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ResponsiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

export function ResponsiveDrawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'left',
  className,
}: ResponsiveDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 z-50 h-full w-full max-w-sm transform bg-white transition-transform duration-300 dark:bg-gray-900',
          side === 'left' ? 'left-0' : 'right-0',
          isOpen ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="h-full overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
