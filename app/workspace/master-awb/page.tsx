'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, FileText, Filter, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface MasterAWBItem {
  id: string;
  awbNumber: string;
  trackingNumber: string;
  senderName: string;
  receiverName: string;
  awbPieces: number;
  awbWeight: number;
  chargeableWeight: number;
  freight: number;
  cargoStatus: string;
  createdAt: string;
}

const statusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'pending' => {
  switch (status) {
    case 'DELIVERED': case 'POD_SIGNED': return 'success';
    case 'IN_TRANSIT': case 'DEPARTED': case 'LOADED': return 'info';
    case 'ACCEPTED': case 'RCS': return 'pending';
    case 'CUSTOMS_HOLD': case 'CUSTOMS_QUERY': return 'warning';
    case 'CANCELLED': return 'error';
    default: return 'pending';
  }
};

export default function MasterAWBPage() {
  const [data, setData] = useState<MasterAWBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master-awbs');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {
      // Fallback to empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(
    () => data.filter((item) =>
      !search || item.awbNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.senderName.toLowerCase().includes(search.toLowerCase())
    ),
    [data, search]
  );

  const columns = [
    { header: 'AWB Number', accessorKey: 'awbNumber' as const },
    { header: 'Tracking', accessorKey: 'trackingNumber' as const },
    { header: 'Sender', accessorKey: 'senderName' as const },
    { header: 'Receiver', accessorKey: 'receiverName' as const },
    { header: 'Pieces', accessorKey: 'awbPieces' as const },
    { header: 'Weight', accessorKey: 'chargeableWeight' as const, cell: (info: any) => `${info.getValue()} kg` },
    { header: 'Freight', accessorKey: 'freight' as const, cell: (info: any) => `$${Number(info.getValue()).toFixed(2)}` },
    {
      header: 'Status',
      accessorKey: 'cargoStatus' as const,
      cell: (info: any) => <StatusBadge status={statusVariant(info.getValue() as string)} label={(info.getValue() as string).replace(/_/g, ' ')} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Air Waybills"
        description="Create and manage consolidated master air waybills"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Master AWB' }]}
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

      {/* Search + Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by AWB, tracking, or sender..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={data.length === 0 ? 'No Master AWBs yet' : 'No results found'}
          description={
            data.length === 0
              ? 'Accept your first cargo shipment to create a Master AWB.'
              : 'Try adjusting your search terms.'
          }
          action={
            data.length === 0 ? (
              <Link href="/workspace/export/new">
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" /> New Export
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          pageSize={15}
        />
      )}
    </div>
  );
}
