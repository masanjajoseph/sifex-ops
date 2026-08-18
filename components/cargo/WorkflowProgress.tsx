'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEntitySubscription } from '@/hooks/useRealtimeSubscription';
import {
  FileText, Plane, Package, Warehouse, DollarSign, Truck, CheckCircle, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stage {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending';
  completedAt?: string;
  department?: string;
  user?: string;
}

interface WorkflowProgressProps {
  entityType: 'MasterAWB' | 'HouseAWB';
  entityId: string;
  currentStage?: string;
  currentStatus?: string;
}

const STAGES_CONFIG = [
  { id: 'BOOKING', label: 'Booking', icon: <FileText className="h-4 w-4" /> },
  { id: 'EXPORT', label: 'Export', icon: <Plane className="h-4 w-4" /> },
  { id: 'IMPORT', label: 'Import', icon: <Package className="h-4 w-4" /> },
  { id: 'WAREHOUSE', label: 'Warehouse', icon: <Warehouse className="h-4 w-4" /> },
  { id: 'BILLING', label: 'Billing', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'DELIVERY', label: 'Delivery', icon: <Truck className="h-4 w-4" /> },
  { id: 'COMPLETED', label: 'Completed', icon: <CheckCircle className="h-4 w-4" /> },
];

const STATUS_TO_STAGE: Record<string, string> = {
  DRAFT: 'EXPORT', VALIDATED: 'EXPORT', HAWB_GENERATED: 'EXPORT',
  MAWB_ASSIGNED: 'EXPORT', MANIFEST_CREATED: 'EXPORT',
  FLIGHT_ASSIGNED: 'EXPORT', DISPATCHED: 'EXPORT', IN_TRANSIT: 'IMPORT',
  RECEIVED: 'IMPORT', VERIFIED: 'IMPORT', WAREHOUSE_RECEIVING: 'WAREHOUSE',
  AWAITING_STORAGE: 'WAREHOUSE', STORED: 'WAREHOUSE',
  INVOICE_GENERATED: 'WAREHOUSE', WAITING_PAYMENT: 'BILLING', PAID: 'BILLING',
  WAITING_DELIVERY: 'DELIVERY', RIDER_ASSIGNED: 'DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERY', DELIVERED: 'DELIVERY', COMPLETED: 'COMPLETED',
};

export function WorkflowProgress({ entityType, entityId, currentStage, currentStatus }: WorkflowProgressProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflow-progress?entityType=${entityType}&entityId=${entityId}${currentStatus ? `&status=${currentStatus}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStages(json.data || []);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [entityType, entityId, currentStatus]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  useEntitySubscription(entityType, entityId, fetchProgress);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Workflow Progress</h3>
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (stages.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Workflow Progress</h3>
      <div className="space-y-1">
        {stages.map((stage, idx) => (
          <div key={stage.id} className="relative flex items-start gap-3">
            {idx < stages.length - 1 && (
              <div className={cn(
                "absolute left-[15px] top-8 h-full w-0.5",
                stage.status === 'completed' ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
              )} />
            )}
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 shrink-0",
              stage.status === 'completed' && "border-green-500 bg-green-50 text-green-600 dark:border-green-400 dark:bg-green-950 dark:text-green-400",
              stage.status === 'current' && "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-400",
              stage.status === 'pending' && "border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500",
            )}>
              {stage.status === 'completed' ? <CheckCircle className="h-4 w-4" /> : stage.icon}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <p className={cn(
                "text-sm font-medium",
                stage.status === 'completed' && "text-green-700 dark:text-green-300",
                stage.status === 'current' && "text-blue-700 dark:text-blue-300",
                stage.status === 'pending' && "text-gray-500 dark:text-gray-400",
              )}>
                {stage.label}
              </p>
              {stage.status === 'completed' && stage.completedAt && (
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {new Date(stage.completedAt).toLocaleDateString()}
                  </span>
                  {stage.user && (
                    <span className="text-xs text-gray-400">{stage.user}</span>
                  )}
                  {stage.department && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {stage.department}
                    </span>
                  )}
                </div>
              )}
              {stage.status === 'current' && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                  <Clock className="h-3 w-3" /> Current
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
