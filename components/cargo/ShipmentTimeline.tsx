'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEntitySubscription } from '@/hooks/useRealtimeSubscription';
import {
  CheckCircle, Circle, Clock, Plane, Truck, Warehouse, DollarSign,
  FileText, User, Package, AlertTriangle, SearchX, MapPin, Pen,
  Printer, Send, Link, Shield, Eye, Play, XCircle, Phone, MessageSquare, Map
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string } | null;
  department?: string | null;
  branch?: { id: string; name: string; code: string } | null;
  workflowStage?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  action?: string | null;
  notes?: string | null;
}

const EVENT_ICONS: Record<string, any> = {
  'workflow.export.draft': FileText,
  'workflow.export.validated': CheckCircle,
  'workflow.export.hawb_generated': FileText,
  'workflow.export.loading_started': Package,
  'workflow.export.loaded': CheckCircle,
  'workflow.export.mawb_assigned': Link,
  'workflow.export.manifest_created': FileText,
  'workflow.export.flight_assigned': Plane,
  'workflow.export.flight_dispatched': Send,
  'workflow.export.in_transit': Plane,
  'workflow.import.received': Package,
  'workflow.import.verified': CheckCircle,
  'workflow.import.warehouse_receiving': Warehouse,
  'workflow.warehouse.stored': Package,
  'workflow.warehouse.invoice_generated': DollarSign,
  'workflow.warehouse.waiting_payment': DollarSign,
  'workflow.billing.paid': DollarSign,
  'workflow.delivery.rider_assigned': User,
  'workflow.delivery.out_for_delivery': Truck,
  'workflow.delivery.delivered': CheckCircle,
  'workflow.delivery.completed': CheckCircle,
};

const CUSTOMER_EVENT_TYPES = [
  'workflow.export.draft', 'workflow.export.validated',
  'workflow.export.hawb_generated', 'workflow.export.loading_started', 'workflow.export.loaded', 'workflow.export.mawb_assigned',
  'workflow.export.manifest_created', 'workflow.export.flight_assigned',
  'workflow.export.flight_dispatched', 'workflow.export.in_transit',
  'workflow.import.received', 'workflow.import.verified',
  'workflow.warehouse.stored', 'workflow.billing.paid',
  'workflow.delivery.out_for_delivery', 'workflow.delivery.delivered',
  'workflow.delivery.completed',
];

interface ShipmentTimelineProps {
  entityType: 'MasterAWB' | 'HouseAWB';
  entityId: string;
  customerView?: boolean;
}

export function ShipmentTimeline({ entityType, entityId, customerView }: ShipmentTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/timeline/${entityType}/${entityId}`);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  useEntitySubscription(entityType, entityId, fetchTimeline);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const filteredEvents = customerView
    ? events.filter(e => CUSTOMER_EVENT_TYPES.includes(e.eventType))
    : events;

  if (filteredEvents.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-gray-400">
        <Clock className="mb-2 h-8 w-8" />
        <p className="text-sm">No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-5">
        {filteredEvents.map((event, i) => {
          const Icon = EVENT_ICONS[event.eventType] || Circle;
          const isFirst = i === 0;
          const date = new Date(event.createdAt);
          const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <div key={event.id} className="relative flex gap-4">
              <div className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isFirst ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 pt-1">
                <p className={`text-sm font-medium ${isFirst ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {event.title}
                </p>
                {event.description && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
                )}
                {event.notes && (
                  <p className="mt-0.5 text-xs italic text-gray-400 dark:text-gray-500">{event.notes}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                  <span>{dateStr}</span>
                  <span>{timeStr}</span>
                  {event.user && (
                    <>
                      <span>·</span>
                      <span>{event.user.firstName} {event.user.lastName}</span>
                    </>
                  )}
                  {event.department && (
                    <>
                      <span>·</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] dark:bg-gray-800">{event.department}</span>
                    </>
                  )}
                  {event.workflowStage && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      {event.workflowStage}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
