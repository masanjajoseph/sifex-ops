'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'space-y-4',
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium text-foreground',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
          'h-7 w-7 bg-transparent p-0 hover:bg-accent hover:text-accent-foreground',
          'opacity-50 hover:opacity-100',
          'absolute left-1'
        ),
        button_next: cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
          'h-7 w-7 bg-transparent p-0 hover:bg-accent hover:text-accent-foreground',
          'opacity-50 hover:opacity-100',
          'absolute right-1'
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]',
        weeks: 'flex w-full mt-2',
        week: 'flex w-full mt-2',
        day: cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
          'h-8 w-8 p-0 aria-selected:opacity-100',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        ),
        day_button: cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
          'h-8 w-8 p-0',
          'hover:bg-accent hover:text-accent-foreground'
        ),
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'bg-accent text-accent-foreground',
        outside:
          'text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
