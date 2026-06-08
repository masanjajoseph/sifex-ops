'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, FileText, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AcceptCargoDialog } from '@/components/cargo/AcceptCargoDialog';

interface HouseAWBItem {
  id: string;
  houseAWBNumber: string;
  trackingNumber: string;
  masterAWB?: { awbNumber: string };
  shipperId: string;
  pieces: number;
  weight: number;
  cargoStatus: string;
  createdAt: string;
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

export default function HouseAWBPage() {
  const [data, setData] = useState<HouseAWBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/house-awbs');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch { /* fallback */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(
    () => data.filter((i) =>
      !search ||
      i.houseAWBNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.trackingNumber.toLowerCase().includes(search.toLowerCase())
    ),
    [data, search]
  );

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
            <AcceptCargoDialog onSuccess={fetchData} />
          </div>
        }
      />

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by HAWB number or tracking..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={data.length === 0 ? 'No House AWBs yet' : 'No results'}
          description="House AWBs are automatically created when cargo is accepted."
          action={data.length === 0 ? <AcceptCargoDialog /> : undefined}
        />
      ) : (
        <DataTable
          columns={[
            { header: 'HAWB Number', accessorKey: 'houseAWBNumber' as const },
            { header: 'Tracking', accessorKey: 'trackingNumber' as const },
            { header: 'Master AWB', accessorKey: 'masterAWB' as const, cell: ({ row }: any) => row.original.masterAWB?.awbNumber || '-' },
            { header: 'Pieces', accessorKey: 'pieces' as const },
            { header: 'Weight', accessorKey: 'weight' as const, cell: (info: any) => `${info.getValue()} kg` },
            { header: 'Status', accessorKey: 'cargoStatus' as const, cell: (info: any) => <StatusBadge status={statusVariant(info.getValue() as string)} label={(info.getValue() as string).replace(/_/g, ' ')} /> },
          ]}
          data={filtered}
          pageSize={15}
        />
      )}
    </div>
  );
}
