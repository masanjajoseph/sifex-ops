'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDef {
  id: string;
  label: string;
  options: FilterOption[];
  value?: string;
  onChange?: (value: string) => void;
}

interface FilterBarProps {
  filters: FilterDef[];
  className?: string;
  onClearAll?: () => void;
}

export function FilterBar({ filters, className, onClearAll }: FilterBarProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFilterCount = filters.filter((f) => f.value && f.value !== 'all').length;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} ref={dropdownRef}>
      {filters.map((filter) => {
        const isActive = !!filter.value && filter.value !== 'all';
        const selectedLabel = filter.options.find((o) => o.value === filter.value)?.label;

        return (
          <div key={filter.id} className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === filter.id ? null : filter.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600'
              )}
            >
              <span className="text-xs font-medium">
                {isActive ? `${filter.label}: ${selectedLabel}` : filter.label}
              </span>
              {isActive ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    filter.onChange?.('all');
                  }}
                  className="ml-1 cursor-pointer rounded p-0.5 hover:bg-blue-200/50 dark:hover:bg-blue-800/50"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); filter.onChange?.('all'); } }}
                  aria-label={`Clear ${filter.label} filter`}
                >
                  <X className="h-3 w-3" />
                </span>
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              )}
            </button>

            {openFilter === filter.id && (
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  {filter.label}
                </div>
                <div className="py-1">
                  {filter.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        filter.onChange?.(option.value);
                        setOpenFilter(null);
                      }}
                      className={cn(
                        'flex w-full items-center px-3 py-2 text-left text-sm transition-colors',
                        filter.value === option.value
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                      )}
                    >
                      {filter.value === option.value && (
                        <span className="mr-2 text-blue-600 dark:text-blue-400">✓</span>
                      )}
                      <span className={cn(filter.value !== option.value && 'ml-5')}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {activeFilterCount > 0 && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
