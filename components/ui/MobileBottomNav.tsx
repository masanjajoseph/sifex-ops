'use client';

import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

interface MobileBottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

interface MobileBottomNavProps {
  items: MobileBottomNavItem[];
  className?: string;
}

export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:hidden',
        className
      )}
    >
      <div className="flex items-center justify-around">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href || '#'}
            onClick={(e) => {
              if (item.onClick) {
                e.preventDefault();
                item.onClick();
              }
            }}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 px-4 py-3 text-xs font-medium transition-colors',
              item.active
                ? 'border-t-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            )}
          >
            <div className="h-6 w-6">{item.icon}</div>
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
