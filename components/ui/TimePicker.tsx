'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIMES.push(
      `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    );
  }
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600',
          !value && 'text-gray-400'
        )}
      >
        <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span>{value || 'Select time'}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {TIMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800',
                t === value && 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
