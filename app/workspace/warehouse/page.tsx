'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Warehouse, Search, RefreshCw, Package, Truck, Pen, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface MawbItem {
  id: string;
  awbNumber: string;
  trackingNumber: string;
  awbPieces: number;
  awbWeight: number;
  chargeableWeight: number;
  cargoStatus: string;
  createdAt: string;
  originStation?: { code: string };
  destinationStation?: { code: string };
  houseAWBs?: Array<{ id: string; houseAWBNumber: string; cargoStatus: string }>;
}

interface HawbReadyItem {
  id: string;
  houseAWBNumber: string;
  trackingNumber: string;
  pieces: number;
  weight: number;
  cargoStatus: string;
  billingStatus: string;
  paymentMethod: string | null;
  masterAWB?: { awbNumber: string };
}

const billingVariant = (s: string) => {
  const st = s.toUpperCase();
  if (st === 'PAID') return 'success';
  if (st === 'CREDITED') return 'info';
  if (st === 'UNPAID' || st === 'NOT_BILLED' || st === 'DRAFT' || st === 'INVOICED') return 'pending';
  return 'pending';
};

const statusVariant = (s: string) => {
  switch (s) {
    case 'DISPATCHED': case 'RELEASED': case 'AWAITING_DELIVERY': return 'success';
    case 'RACKED': case 'STORED': case 'OUT_FOR_DELIVERY': return 'info';
    case 'RECEIVED': case 'PICKED_UP': return 'pending';
    case 'HELD': case 'EXCEPTION': return 'error';
    default: return 'pending';
  }
};

export default function WarehousePage() {
  const router = useRouter();
  const [releasedMawbs, setReleasedMawbs] = useState<MawbItem[]>([]);
  const [readyHawbs, setReadyHawbs] = useState<HawbReadyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'released' | 'ready'>('released');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const notDelivered = encodeURIComponent('DELIVERED,POD_SIGNED');
      const [mawbRes, hawbRes] = await Promise.all([
        fetch('/api/master-awbs?limit=50&scope=warehouse'),
        fetch(`/api/house-awbs?limit=100&notStatus=${notDelivered}`),
      ]);
      if (mawbRes.ok) { const j = await mawbRes.json(); setReleasedMawbs(j.data || []); }
      if (hawbRes.ok) { const j = await hawbRes.json(); setReadyHawbs(j.data || []); }
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filterBySearch = (items: any[], fields: string[]) =>
    items.filter(i => !search || fields.some(f => String(i[f] || '').toLowerCase().includes(search.toLowerCase())));

  const filteredMawbs = useMemo(() => filterBySearch(releasedMawbs, ['awbNumber', 'trackingNumber']), [releasedMawbs, search]);
  const filteredReady = useMemo(() => filterBySearch(readyHawbs, ['houseAWBNumber', 'trackingNumber', 'masterAWB.awbNumber']), [readyHawbs, search]);

  const handleMarkReady = async (hawbId: string) => {
    setActionLoading(hawbId);
    try {
      const res = await fetch(`/api/house-awbs/${hawbId}/ready-for-delivery`, { method: 'POST' });
      if (res.ok) { await fetchData(); }
    } finally { setActionLoading(null); }
  };

  const handlePickup = (hawbId: string) => {
    router.push(`/workspace/house-awb/${hawbId}?action=pickup`);
  };

  const totalReady = readyHawbs.filter(h => h.cargoStatus === 'RELEASED' || h.cargoStatus === 'AWAITING_DELIVERY').length;
  const totalOut = readyHawbs.filter(h => h.cargoStatus === 'OUT_FOR_DELIVERY').length;
  const totalPicked = readyHawbs.filter(h => h.cargoStatus === 'PICKED_UP').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouse Operations" description="Manage warehouse inventory, dispatch, and delivery readiness"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Warehouse' }]}
        action={<Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button>} />

      <div className="grid gap-4 sm:grid-cols-5">
        <StatCard label="Released MAWBs" value={releasedMawbs.length} icon={<Warehouse className="h-5 w-5" />} />
        <StatCard label="Awaiting Delivery" value={totalReady} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Out for Delivery" value={totalOut} icon={<Truck className="h-5 w-5" />} />
        <StatCard label="Picked Up" value={totalPicked} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
          <button onClick={() => setTab('released')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${tab === 'released' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Released MAWBs ({releasedMawbs.length})</button>
          <button onClick={() => setTab('ready')} className={`px-4 py-2 text-sm font-medium rounded-r-lg ${tab === 'ready' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Ready for Delivery ({totalReady})</button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by AWB..." className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : tab === 'released' ? (
        filteredMawbs.length === 0 ? <EmptyState icon={<Package className="h-12 w-12" />} title="No released MAWBs" description="Released MAWBs will appear here." />
        : <DataTable columns={[
          { header: 'AWB', accessorKey: 'awbNumber' as const },
          { header: 'Tracking', accessorKey: 'trackingNumber' as const },
          { header: 'Pieces', accessorKey: 'awbPieces' as const },
          { header: 'Weight', accessorKey: 'chargeableWeight' as const, cell: (i: any) => `${i.getValue()} kg` },
          { header: 'Origin', accessorKey: 'originStation' as const, cell: (i: any) => i.getValue()?.code || '-' },
          { header: 'Dest', accessorKey: 'destinationStation' as const, cell: (i: any) => i.getValue()?.code || '-' },
          { header: 'Status', accessorKey: 'cargoStatus' as const, cell: (i: any) => <StatusBadge status="success" label="RELEASED" /> },
        ]} data={filteredMawbs} pageSize={15} />
      ) : (
        filteredReady.length === 0 ? <EmptyState icon={<Truck className="h-12 w-12" />} title="No HAWBs ready for delivery" description="Mark released HAWBs as ready for delivery from the MAWB detail page." />
        : <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {filteredReady.map(h => (
              <div key={h.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex-1 min-w-0">
                  <button onClick={() => router.push(`/workspace/house-awb/${h.id}`)} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">{h.houseAWBNumber}</button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{h.pieces} pcs · {h.weight} kg · {h.masterAWB?.awbNumber || '-'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={billingVariant(h.billingStatus)} label={h.billingStatus.replace(/_/g, ' ')} />
                  <StatusBadge status={h.cargoStatus === 'AWAITING_DELIVERY' ? 'pending' : h.cargoStatus === 'OUT_FOR_DELIVERY' ? 'info' : 'success'} label={h.cargoStatus.replace(/_/g, ' ')} />
                  {h.cargoStatus === 'AWAITING_DELIVERY' && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handlePickup(h.id)} disabled={actionLoading === h.id}>
                        <Pen className="mr-1 h-3 w-3" /> Pickup Note
                      </Button>
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleMarkReady(h.id)} disabled={actionLoading === h.id}>
                        <Truck className="mr-1 h-3 w-3" /> Assign Rider
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
      )}
    </div>
  );
}
