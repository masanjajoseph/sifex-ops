'use client';

import { useState } from 'react';
import { Truck, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

const mockDeliveries = [
  { id: 'DEL-001', customer: 'Tanzania Cargo Ltd', destination: 'Dar es Salaam', status: 'IN_PROGRESS' as const, rider: 'Juma Ali' },
  { id: 'DEL-002', customer: 'East African Logistics', destination: 'Mombasa Road', status: 'ASSIGNED' as const, rider: 'Sarah Oka' },
];

export default function DeliveryPage() {
  const [deliveries] = useState(mockDeliveries);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Management"
        description="Manage last-mile delivery and rider dispatch"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Delivery' }]}
        action={
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Deliveries" value={deliveries.length} icon={<Truck className="h-5 w-5" />} />
        <StatCard label="In Progress" value={deliveries.filter(d => d.status === 'IN_PROGRESS').length} icon={<Truck className="h-5 w-5" />} />
        <StatCard label="Pending Assign" value={deliveries.filter(d => d.status === 'ASSIGNED').length} icon={<Truck className="h-5 w-5" />} />
      </div>
      {deliveries.length === 0 ? (
        <EmptyState icon={<Truck className="h-12 w-12" />} title="No deliveries" description="Deliveries will appear once shipments are ready." />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {deliveries.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{d.customer}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{d.destination} · Rider: {d.rider}</p>
                </div>
                <StatusBadge status={d.status === 'IN_PROGRESS' ? 'info' : 'warning'} label={d.status.replace(/_/g, ' ')} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
