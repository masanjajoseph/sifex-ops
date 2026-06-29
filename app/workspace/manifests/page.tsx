'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, RefreshCw, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';

interface ManifestItem {
  id: string;
  manifestNumber: string;
  manifestType: string;
  flightId: string;
  status: string;
  totalPieces: number;
  totalWeight: number;
  createdAt: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'LOADED': case 'DEPARTED': return 'info' as const;
    case 'CONFIRMED': return 'success' as const;
    case 'CREATED': return 'pending' as const;
    default: return 'pending' as const;
  }
};

export default function ManifestsPage() {
  const [data, setData] = useState<ManifestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manifests?limit=50');
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
    total: data.length,
    totalItems: data.reduce((a, m) => a + m.totalPieces, 0),
    loaded: data.filter((m) => m.status === 'LOADED').length,
  }), [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargo Manifests"
        description="Create and manage cargo manifests for air transport"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Manifests' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Manifest
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Manifests" value={stats.total} icon={<FileSpreadsheet className="h-5 w-5" />} />
        <StatCard label="Total Items" value={stats.totalItems} icon={<FileSpreadsheet className="h-5 w-5" />} />
        <StatCard label="Loaded Today" value={stats.loaded} icon={<FileSpreadsheet className="h-5 w-5" />} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet className="h-12 w-12" />}
          title="No manifests yet"
          description="Create a manifest to consolidate shipments for a flight."
          action={<Button><Plus className="mr-1 h-4 w-4" /> New Manifest</Button>}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">All Manifests</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.manifestNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.manifestType} · {m.totalPieces} items · {m.totalWeight} kg</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                  <StatusBadge status={statusVariant(m.status)} label={m.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
