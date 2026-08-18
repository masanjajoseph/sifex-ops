'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Warehouse, Search, RefreshCw, Package, Truck, CheckCircle,
  Layers, Grid3X3, Printer, DollarSign, User, Loader2
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface DashboardStats {
  awaitingStorage: number;
  stored: number;
  waitingPayment: number;
  storedToday: number;
  invoiceGenerated: number;
  totalInventory: number;
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'COMPLETED': case 'DELIVERED': case 'POD_SIGNED': case 'RELEASED': return 'success';
    case 'WAREHOUSE_RECEIVING': case 'AWAITING_STORAGE': case 'STORED': return 'info';
    case 'INVOICE_GENERATED': case 'WAITING_PAYMENT': return 'warning';
    case 'HELD': case 'EXCEPTION': return 'error';
    default: return 'pending';
  }
};

export default function WarehousePage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [shipments, setShipments] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    awaitingStorage: 0, stored: 0, waitingPayment: 0,
    storedToday: 0, invoiceGenerated: 0, totalInventory: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'awaiting' | 'stored' | 'billing'>('awaiting');
  const [assignEntity, setAssignEntity] = useState<string | null>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [shipRes, statsRes] = await Promise.all([
        fetch('/api/master-awbs?limit=100&scope=warehouse'),
        fetch('/api/dashboard/warehouse'),
      ]);
      if (shipRes.ok) { const j = await shipRes.json(); setShipments(j.data || []); }
      if (statsRes.ok) { const j = await statsRes.json(); if (j.success) setStats(j.data); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filterBySearch = useCallback((items: any[]) =>
    items.filter(i => !search ||
      String(i.awbNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      String(i.trackingNumber || '').toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const awaitingStorage = useMemo(() => filterBySearch(shipments.filter((s: any) => s.workflowStatus === 'WAREHOUSE_RECEIVING' || s.workflowStatus === 'AWAITING_STORAGE')), [shipments, filterBySearch]);
  const stored = useMemo(() => filterBySearch(shipments.filter((s: any) => s.workflowStatus === 'STORED')), [shipments, filterBySearch]);
  const billing = useMemo(() => filterBySearch(shipments.filter((s: any) => ['INVOICE_GENERATED', 'WAITING_PAYMENT'].includes(s.workflowStatus))), [shipments, filterBySearch]);

  const handleAction = async (action: string, entityId: string) => {
    try {
      await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'MasterAWB', entityId, action }),
      });
      fetchData();
    } catch {}
  };

  const openAssignShelf = async (entityId: string) => {
    setAssignEntity(entityId);
    setSelectedZone('');
    setSelectedLocation('');
    try {
      const res = await fetch('/api/warehouse/zones');
      if (res.ok) { const j = await res.json(); setZones(j.data || []); }
    } catch {}
  };

  const onZoneChange = async (zoneId: string) => {
    setSelectedZone(zoneId);
    setSelectedLocation('');
    if (!zoneId) { setLocations([]); return; }
    setLoadingLocations(true);
    try {
      const res = await fetch(`/api/warehouse/locations?zoneId=${zoneId}`);
      if (res.ok) { const j = await res.json(); setLocations(j.data || []); }
    } catch {} finally { setLoadingLocations(false); }
  };

  const handleAssignShelf = async () => {
    if (!assignEntity || !selectedLocation || assignSaving) return;
    setAssignSaving(true);
    try {
      await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'MasterAWB',
          entityId: assignEntity,
          action: 'ASSIGN_SHELF',
          locationId: selectedLocation,
        }),
      });
      setAssignEntity(null);
      fetchData();
    } catch {} finally { setAssignSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouse Operations" description="Manage warehouse inventory, storage, and dispatch"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Warehouse' }]}
        action={<Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button>} />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Awaiting Storage" value={stats.awaitingStorage} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Stored" value={stats.stored} icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Waiting Payment" value={stats.waitingPayment} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Stored Today" value={stats.storedToday} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
          <button onClick={() => setTab('awaiting')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${tab === 'awaiting' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Awaiting Storage ({stats.awaitingStorage})</button>
          <button onClick={() => setTab('stored')} className={`px-4 py-2 text-sm font-medium ${tab === 'stored' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Stored ({stats.stored})</button>
          <button onClick={() => setTab('billing')} className={`px-4 py-2 text-sm font-medium rounded-r-lg ${tab === 'billing' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Billing ({stats.waitingPayment})</button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by AWB..." className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : tab === 'awaiting' ? (
        awaitingStorage.length === 0 ? <EmptyState icon={<Package className="h-12 w-12" />} title="No shipments awaiting storage" description="Import shipments will appear here when received into warehouse." />
        : <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {awaitingStorage.map((s: any) => (
              <div key={s.id}>
                <div className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.awbNumber}</p>
                    <p className="text-xs text-gray-500">{s.awbPieces} pcs · {s.awbWeight} kg</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAssignShelf(s.id)}>
                      <Layers className="mr-1 h-3 w-3" /> Assign Shelf
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(`/workspace/master-awb/${s.id}/label`, '_blank')}>
                      <Printer className="mr-1 h-3 w-3" /> Print Label
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      ) : tab === 'stored' ? (
        stored.length === 0 ? <EmptyState icon={<Layers className="h-12 w-12" />} title="No stored shipments" description="Stored shipments will appear here." />
        : <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {stored.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{s.awbNumber}</p>
                  <p className="text-xs text-gray-500">{s.awbPieces} pcs · {s.awbWeight} kg</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/master-awb/${s.id}`)}><Package className="mr-1 h-3 w-3" /> View Shipment</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/customers?s=${s.senderName || s.receiverName}`)}><User className="mr-1 h-3 w-3" /> View Customer</Button>
                </div>
              </div>
            ))}
          </div>
      ) : (
        billing.length === 0 ? <EmptyState icon={<DollarSign className="h-12 w-12" />} title="No pending billing" description="Invoices are awaiting payment." />
        : <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {billing.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{s.awbNumber}</p>
                  <p className="text-xs text-gray-500">
                    <DollarSign className="inline h-3 w-3" /> Invoice pending payment
                  </p>
                </div>
                <StatusBadge status="warning" label={s.workflowStatus?.replace(/_/g, ' ') || 'Waiting Payment'} />
              </div>
            ))}
          </div>
      )}

      {assignEntity && (isMobile ? (
        <BottomSheet
          open={!!assignEntity}
          onClose={() => { setAssignEntity(null); setSelectedZone(''); setSelectedLocation(''); }}
          title="Assign Shelf Location"
          description="Select zone and location for storage"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Zone</label>
              <select value={selectedZone} onChange={e => onZoneChange(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <option value="">Select zone...</option>
                {zones.map((z: any) => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Location</label>
              <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} disabled={!selectedZone || loadingLocations}
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <option value="">{loadingLocations ? 'Loading...' : 'Select location...'}</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.code}</option>)}
              </select>
            </div>
            <Button className="w-full bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handleAssignShelf} disabled={!selectedLocation || assignSaving}>
              {assignSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {assignSaving ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </div>
        </BottomSheet>
      ) : (
        <Dialog open={!!assignEntity} onOpenChange={(v) => { if (!v) { setAssignEntity(null); setSelectedZone(''); setSelectedLocation(''); } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Assign Shelf Location</DialogTitle>
              <DialogDescription>Select a zone and storage location for this shipment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Zone</label>
                <select value={selectedZone} onChange={e => onZoneChange(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  <option value="">Select zone...</option>
                  {zones.map((z: any) => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Location</label>
                <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} disabled={!selectedZone || loadingLocations}
                  className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  <option value="">{loadingLocations ? 'Loading...' : 'Select location...'}</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.code}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setAssignEntity(null); setSelectedZone(''); setSelectedLocation(''); }}>Cancel</Button>
                <Button size="sm" className="bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handleAssignShelf} disabled={!selectedLocation || assignSaving}>
                  {assignSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  {assignSaving ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
