'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, FileText, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface HouseAWBItem {
  id: string;
  houseAWBNumber: string;
  trackingNumber: string;
  masterAWB?: { awbNumber: string };
  pieces: number;
  weight: number;
  cargoStatus: string;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'DELIVERED': case 'POD_SIGNED': return 'success' as const;
    case 'IN_TRANSIT': case 'DEPARTED': case 'LOADED': return 'info' as const;
    case 'ACCEPTED': case 'RCS': return 'pending' as const;
    case 'CUSTOMS_HOLD': return 'warning' as const;
    case 'CANCELLED': return 'error' as const;
    default: return 'pending' as const;
  }
};

const PAGE_SIZE = 50;

export default function HouseAWBPage() {
  const [data, setData] = useState<HouseAWBItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/house-awbs?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
        if (json.pagination) setPagination(json.pagination);
      }
    } catch { /* fallback */ } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="House Air Waybills"
        description="Individual customer shipments under consolidation"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'House AWB' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Link href="/workspace/export/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> New Export
              </Button>
            </Link>
          </div>
        }
      />

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by HAWB number or tracking..."
          className="pl-9"
        />
      </div>

      <p className="text-xs text-gray-400">{pagination.total} total records</p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={pagination.total === 0 ? 'No House AWBs yet' : 'No results'}
          description="House AWBs are automatically created when cargo is accepted."
          action={pagination.total === 0 ? (
            <Link href="/workspace/export/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> New Export
              </Button>
            </Link>
          ) : undefined}
        />
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((ha) => (
                <div
                  key={ha.id}
                  className="flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => window.location.href = `/workspace/house-awb/${ha.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{ha.houseAWBNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {ha.trackingNumber}
                      {ha.masterAWB && <span> · MAWB: {ha.masterAWB.awbNumber}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{ha.pieces} pcs</span>
                    <span>{ha.weight} kg</span>
                    <StatusBadge status={statusVariant(ha.cargoStatus)} label={ha.cargoStatus.replace(/_/g, ' ')} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
