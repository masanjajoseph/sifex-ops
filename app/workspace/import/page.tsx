'use client';

import { useState } from 'react';
import { PackageOpen, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

const mockImports = [
  { id: 'IMP-001', origin: 'CAN', pieces: 120, weight: 850, status: 'UNDER_CLEARANCE' as const, date: '2026-05-26' },
  { id: 'IMP-002', origin: 'DXB', pieces: 34, weight: 210, status: 'ARRIVED' as const, date: '2026-05-25' },
  { id: 'IMP-003', origin: 'NBO', pieces: 56, weight: 430, status: 'RELEASED' as const, date: '2026-05-24' },
];

export default function ImportPage() {
  const [imports] = useState(mockImports);

  const statusVariant = (s: string) => {
    switch (s) {
      case 'RELEASED': case 'DELIVERED': return 'success' as const;
      case 'ARRIVED': case 'IN_TRANSIT': return 'info' as const;
      case 'UNDER_CLEARANCE': return 'warning' as const;
      case 'CUSTOMS_HOLD': return 'error' as const;
      default: return 'pending' as const;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Operations"
        description="Handle import clearance, processing, and inbound logistics"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Import Operations' }]}
        action={
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Active Imports" value={imports.length} icon={<PackageOpen className="h-5 w-5" />} />
        <StatCard label="Under Clearance" value={imports.filter(i => i.status === 'UNDER_CLEARANCE').length} icon={<PackageOpen className="h-5 w-5" />} />
        <StatCard label="Released" value={imports.filter(i => i.status === 'RELEASED').length} icon={<PackageOpen className="h-5 w-5" />} />
        <StatCard label="Total Weight" value={`${imports.reduce((a, i) => a + i.weight, 0)} kg`} icon={<PackageOpen className="h-5 w-5" />} />
      </div>

      {imports.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-12 w-12" />}
          title="No import shipments"
          description="Import shipments will appear once they arrive at destination stations."
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Import Shipments</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {imports.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{i.id}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{i.origin} → DAR · {i.pieces} pcs · {i.weight} kg</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{i.date}</span>
                  <StatusBadge status={statusVariant(i.status)} label={i.status.replace(/_/g, ' ')} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
