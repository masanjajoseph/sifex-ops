'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  items: CommandItem[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ items, isOpen = false, onOpenChange }: CommandPaletteProps) {
  const [open, setOpen] = useState(isOpen);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = items.filter((item) => {
    const query = search.toLowerCase();
    return (
      item.label.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.keywords?.some((k) => k.toLowerCase().includes(query))
    );
  });

  const grouped = filtered.reduce(
    (acc, item) => {
      const category = item.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  const handleSelect = useCallback(() => {
    const allItems = Object.values(grouped).flat();
    if (allItems[selectedIndex]) {
      allItems[selectedIndex].onSelect();
      setOpen(false);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [grouped, selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const allItems = Object.values(grouped).flat();
          setSelectedIndex((prev) => (prev + 1) % allItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const allItems2 = Object.values(grouped).flat();
          setSelectedIndex((prev) => (prev - 1 + allItems2.length) % allItems2.length);
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect();
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, grouped, handleSelect]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  const allItems = Object.values(grouped).flat();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => setOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-lg">
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {/* Search Input */}
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search commands..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                className="w-full bg-transparent text-sm outline-none dark:text-white"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {allItems.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">No commands found</p>
              </div>
            ) : (
              Object.entries(grouped).map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="border-t border-gray-200 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    {category}
                  </div>
                  {categoryItems.map((item, idx) => {
                    const globalIndex = allItems.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedIndex(globalIndex);
                          handleSelect();
                        }}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm transition-colors',
                          globalIndex === selectedIndex
                            ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100'
                            : 'text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon && <span className="text-gray-400">{item.icon}</span>}
                          <div className="flex-1">
                            <div className="font-medium">{item.label}</div>
                            {item.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
            <div className="flex items-center justify-between">
              <span>
                <kbd className="rounded bg-gray-200 px-2 py-1 dark:bg-gray-700">↑↓</kbd>
                <span className="ml-2">Navigate</span>
              </span>
              <span>
                <kbd className="rounded bg-gray-200 px-2 py-1 dark:bg-gray-700">Enter</kbd>
                <span className="ml-2">Select</span>
              </span>
              <span>
                <kbd className="rounded bg-gray-200 px-2 py-1 dark:bg-gray-700">Esc</kbd>
                <span className="ml-2">Close</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
