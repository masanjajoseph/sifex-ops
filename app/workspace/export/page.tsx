'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, RefreshCw, Plus, Package, Weight, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterBar } from '@/components/ui/FilterBar';

interface MasterAWB {
  id: string;
  awbNumber: string;
  trackingNumber: string;
  senderName: string;
  receiverName: string;
  awbPieces: number;
  awbWeight: number;
  cargoStatus: string;
  shipmentType: string;
  originStation: { code: string } | null;
  destinationStation: { code: string } | null;
  createdAt: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'DELIVERED': case 'POD_SIGNED': case 'RELEASED': return 'success' as const;
    case 'IN_TRANSIT': case 'MANIFESTED': case 'LOADED': case 'DEPARTED': return 'info' as const;
    case 'ACCEPTED': case 'RCS': case 'INITIATED': return 'pending' as const;
    case 'CUSTOMS_HOLD': case 'CUSTOMS_QUERY': case 'UNDER_CLEARANCE': return 'warning' as const;
    case 'CANCELLED': case 'OFFLOADED': return 'error' as const;
    default: return 'pending' as const;
  }
};

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'INITIATED', label: 'Initiated' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'RCS', label: 'RCS' },
  { value: 'MANIFESTED', label: 'Manifested' },
  { value: 'LOADED', label: 'Loaded' },
  { value: 'DEPARTED', label: 'Departed' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'ARRIVED', label: 'Arrived' },
  { value: 'UNDER_CLEARANCE', label: 'Under Clearance' },
  { value: 'CUSTOMS_HOLD', label: 'Customs Hold' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ExportPage() {
  const router = useRouter();
  const [exports, setExports] = useState<MasterAWB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchExports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/master-awbs?${params}`);
      const json = await res.json();
      if (json.success) {
        setExports(json.data || []);
        setTotalPages(json.meta?.totalPages || 1);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      setExports([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchExports(); }, [fetchExports]);

  const activeExports = exports.filter(e =>
    ['INITIATED', 'ACCEPTED', 'RCS', 'MANIFESTED', 'LOADED', 'DEPARTED', 'IN_TRANSIT', 'UNDER_CLEARANCE'].includes(e.cargoStatus)
  ).length;
  const totalPieces = exports.reduce((a, e) => a + e.awbPieces, 0);
  const totalWeight = exports.reduce((a, e) => a + e.awbWeight, 0);
  const inTransit = exports.filter(e => e.cargoStatus === 'IN_TRANSIT').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Operations"
        description="Manage export shipments and air waybill documentation"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Export Operations' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchExports}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/workspace/export/new')}>
              <Plus className="mr-1 h-4 w-4" /> New Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Active Exports" value={activeExports} icon={<Plane className="h-5 w-5" />} />
        <StatCard label="Total Pieces" value={totalPieces} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Total Weight" value={`${totalWeight.toLocaleString()} kg`} icon={<Weight className="h-5 w-5" />} />
        <StatCard label="In Transit" value={inTransit} icon={<MapPin className="h-5 w-5" />} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <SearchInput
            placeholder="Search by AWB, tracking, sender, receiver..."
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            className="max-w-md"
          />
          <FilterBar
            filters={[
              {
                id: 'status',
                label: 'Status',
                options: statusOptions,
                value: statusFilter,
                onChange: (v) => { setStatusFilter(v); setPage(1); },
              },
            ]}
            onClearAll={() => { setStatusFilter('all'); setSearch(''); setPage(1); }}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{total} total shipments</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : exports.length === 0 ? (
        <EmptyState
          icon={<Plane className="h-12 w-12" />}
          title="No export shipments"
          description={search || statusFilter !== 'all' ? 'No shipments match your filters.' : 'Accept cargo to create export shipments.'}
          action={!search && statusFilter === 'all' ? (
            <Button onClick={() => router.push('/workspace/export/new')}>
              <Plus className="mr-1 h-4 w-4" /> Create First Export
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {exports.map((e) => (
              <div
                key={e.id}
                className="flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => router.push(`/workspace/export/${e.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{e.awbNumber}</p>
                    <span className="text-xs text-gray-400">#{e.trackingNumber}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {e.senderName} → {e.receiverName}
                    {e.originStation && e.destinationStation && (
                      <span> · {e.originStation.code} → {e.destinationStation.code}</span>
                    )}
                    <span> · {e.awbPieces} pcs · {e.awbWeight} kg</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </span>
                  <StatusBadge status={statusVariant(e.cargoStatus)} label={e.cargoStatus.replace(/_/g, ' ')} />
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
