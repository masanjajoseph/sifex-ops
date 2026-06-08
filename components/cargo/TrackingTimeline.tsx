'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Package,
  PackageCheck,
  Warehouse,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  ClipboardCheck,
  Shield,
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Scan,
  XCircle,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string | null;
  status?: string;
  userId?: string;
  stationId?: string;
  scanSource?: string;
  remarks?: string | null;
  createdAt: string | Date;
}

interface TrackingTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const eventIconMap: Record<string, React.ElementType> = {
  ACCEPTED: PackageCheck,
  RCS: Package,
  LOADED: PlaneTakeoff,
  MANIFESTED: ClipboardCheck,
  OFFLOADED: PlaneLanding,
  DEPARTED: PlaneTakeoff,
  IN_TRANSIT: Plane,
  ARRIVED: PlaneLanding,
  UNDER_CLEARANCE: Shield,
  CUSTOMS_HOLD: AlertTriangle,
  CUSTOMS_QUERY: AlertTriangle,
  RELEASED: ShieldCheck,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
  POD_SIGNED: CheckCircle2,
  CANCELLED: XCircle,
  WAREHOUSE_RECEIVED: Warehouse,
  WAREHOUSE_STORED: Warehouse,
  SCAN_PICKUP: Scan,
};

const eventColorMap: Record<string, string> = {
  ACCEPTED: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  RCS: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  LOADED: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  DEPARTED: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  IN_TRANSIT: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400',
  ARRIVED: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400',
  UNDER_CLEARANCE: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  CUSTOMS_HOLD: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  RELEASED: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  OUT_FOR_DELIVERY: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400',
  DELIVERED: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
};

const defaultColor = 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';

function getEventIcon(eventType: string) {
  const key = Object.keys(eventIconMap).find(
    (k) => eventType.includes(k) || k.includes(eventType)
  );
  return key ? eventIconMap[key] : Clock;
}

function getEventColor(eventType: string) {
  const key = Object.keys(eventColorMap).find(
    (k) => eventType.includes(k) || k.includes(eventType)
  );
  return key ? eventColorMap[key] : defaultColor;
}

function formatTimestamp(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TrackingTimeline({ events, className }: TrackingTimelineProps) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [events]
  );

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
        <Clock className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No tracking events recorded yet</p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {sorted.map((event, idx) => {
        const Icon = getEventIcon(event.eventType);
        const color = getEventColor(event.eventType);
        const isLatest = idx === 0;

        return (
          <div key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Vertical connector line */}
            {idx < sorted.length - 1 && (
              <div className="absolute left-[17px] top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            )}

            {/* Icon circle */}
            <div className="relative z-10 flex-shrink-0">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', color)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn('text-sm font-medium', isLatest ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300')}>
                    {event.title}
                    {isLatest && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Latest
                      </span>
                    )}
                  </p>
                  {event.description && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {event.description}
                    </p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {formatTimestamp(event.createdAt)}
                </time>
              </div>

              {/* Metadata row */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                {event.scanSource && (
                  <span className="inline-flex items-center gap-1">
                    <Scan className="h-3 w-3" />
                    {event.scanSource}
                  </span>
                )}
                {event.stationId && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Station
                  </span>
                )}
                {event.remarks && (
                  <span className="italic">{event.remarks}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TrackingTimelineSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
