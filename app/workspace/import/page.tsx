'use client';

import { useState, useEffect, useMemo } from 'react';
import { PackageOpen, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';

interface ImportItem {
  id: string;
  awbNumber: string;
  cargoStatus: string;
  awbPieces: number;
  awbWeight: number;
  originStationId: string;
  destinationStationId: string;
  createdAt: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'RELEASED': case 'DELIVERED': case 'POD_SIGNED': return 'success' as const;
    case 'ARRIVED': case 'IN_TRANSIT': return 'info' as const;
    case 'UNDER_CLEARANCE': return 'warning' as const;
    case 'CUSTOMS_HOLD': case 'CUSTOMS_QUERY': return 'error' as const;
    default: return 'pending' as const;
  }
};

export default function ImportPage() {
  const [data, setData] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master-awbs?limit=50&scope=import');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => ({
    active: data.length,
    underClearance: data.filter((i) => i.cargoStatus === 'UNDER_CLEARANCE').length,
    released: data.filter((i) => i.cargoStatus === 'RELEASED').length,
    totalWeight: data.reduce((a, i) => a + i.awbWeight, 0),
  }), [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Operations"
        description="Handle import clearance, processing, and inbound logistics"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Import Operations' }]}
        action={
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Active Imports" value={stats.active} icon={<PackageOpen className="h-5 w-5" />} />
        <StatCard label="Under Clearance" value={stats.underClearance} icon={<PackageOpen className="h-5 w-5" />} />
        <StatCard label="Released" value={stats.released} icon={<PackageOpen className="h-5 w-5" />} />
        <StatCard label="Total Weight" value={`${Math.round(stats.totalWeight)} kg`} icon={<PackageOpen className="h-5 w-5" />} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
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
            {data.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{i.awbNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{i.originStationId} → {i.destinationStationId} · {i.awbPieces} pcs · {i.awbWeight} kg</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{new Date(i.createdAt).toLocaleDateString()}</span>
                  <StatusBadge status={statusVariant(i.cargoStatus)} label={i.cargoStatus.replace(/_/g, ' ')} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
