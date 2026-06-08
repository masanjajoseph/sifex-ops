'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

const mockAlerts = [
  { id: '1', title: 'Missing Documentation — MAWB-2024-1284', status: 'HOLD' as const, station: 'JFK', time: '10 min ago' },
  { id: '2', title: 'Customs Query — IMP-2024-456', status: 'QUERY' as const, station: 'LAX', time: '1 hour ago' },
  { id: '3', title: 'Value Declaration Review — EXP-2024-789', status: 'REVIEW' as const, station: 'ORD', time: '3 hours ago' },
];

export default function CustomsPage() {
  const [alerts] = useState(mockAlerts);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customs Operations"
        description="Manage customs clearance, declarations, and compliance"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Customs' }]}
        action={
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Under Review" value="12" icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Customs Hold" value="5" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Cleared Today" value="28" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Total Declarations" value="156" icon={<Shield className="h-5 w-5" />} />
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-12 w-12" />}
          title="No customs alerts"
          description="All shipments are up to date with customs."
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Active Alerts</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    a.status === 'HOLD' ? 'bg-red-500' :
                    a.status === 'QUERY' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{a.station} · {a.time}</p>
                  </div>
                </div>
                <StatusBadge
                  status={a.status === 'HOLD' ? 'error' : a.status === 'QUERY' ? 'warning' : 'info'}
                  label={a.status}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
