'use client';

import { useState, useEffect, useMemo } from 'react';
import { Warehouse, Search, RefreshCw, Package } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface InventoryItem {
  id: string;
  warehouseZone: string;
  storageLocation?: string;
  status: string;
  masterAWB?: { awbNumber: string };
  houseAWB?: { houseAWBNumber: string };
  createdAt: string;
}

const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'info' | 'pending' => {
  switch (s) {
    case 'DISPATCHED': case 'RELEASED': return 'success';
    case 'RACKED': case 'STORED': return 'info';
    case 'RECEIVED': return 'pending';
    case 'HELD': case 'EXCEPTION': return 'error';
    default: return 'pending';
  }
};

export default function WarehousePage() {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/warehouse/inventory');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(
    () => data.filter((i) =>
      !search ||
      i.masterAWB?.awbNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.houseAWB?.houseAWBNumber.toLowerCase().includes(search.toLowerCase())
    ),
    [data, search]
  );

  const stats = useMemo(() => ({
    total: data.length,
    received: data.filter((i) => i.status === 'RECEIVED').length,
    racked: data.filter((i) => i.status === 'RACKED' || i.status === 'STORED').length,
    dispatched: data.filter((i) => i.status === 'DISPATCHED' || i.status === 'RELEASED').length,
  }), [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Operations"
        description="Manage warehouse inventory, receiving, and dispatch"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Warehouse' }]}
        action={
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Items" value={stats.total} icon={<Warehouse className="h-5 w-5" />} />
        <StatCard label="Pending Receive" value={stats.received} icon={<Package className="h-5 w-5" />} />
        <StatCard label="In Storage" value={stats.racked} icon={<Warehouse className="h-5 w-5" />} />
        <StatCard label="Dispatched" value={stats.dispatched} icon={<Package className="h-5 w-5" />} />
      </div>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by AWB number..."
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
          icon={<Warehouse className="h-12 w-12" />}
          title={data.length === 0 ? 'No inventory items' : 'No results'}
          description="Warehouse inventory will appear once cargo is accepted and received."
        />
      ) : (
        <DataTable
          columns={[
            { header: 'AWB', accessorKey: 'masterAWB' as const, cell: (info: any) => info.getValue()?.awbNumber || info.getValue()?.houseAWBNumber || '-' },
            { header: 'Zone', accessorKey: 'warehouseZone' as const },
            { header: 'Location', accessorKey: 'storageLocation' as const, cell: (info: any) => info.getValue() || 'Not assigned' },
            { header: 'Status', accessorKey: 'status' as const, cell: (info: any) => <StatusBadge status={statusVariant(info.getValue() as string)} label={(info.getValue() as string).replace(/_/g, ' ')} /> },
            { header: 'Received', accessorKey: 'createdAt' as const, cell: (info: any) => new Date(info.getValue() as string).toLocaleDateString() },
          ]}
          data={filtered}
          pageSize={15}
        />
      )}
    </div>
  );
}
