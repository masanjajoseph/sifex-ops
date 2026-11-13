'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Warehouse, Search, RefreshCw, Package, Truck, CheckCircle,
  Layers, Grid3X3, Printer, DollarSign, User, Loader2, Plus, Settings2, AlertCircle
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

  const [manageOpen, setManageOpen] = useState(false);
  const [manageZones, setManageZones] = useState<any[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState('');
  const [newZone, setNewZone] = useState({ code: '', name: '', type: 'STORAGE', capacity: '' });
  const [creatingZone, setCreatingZone] = useState(false);
  const [shelfZoneId, setShelfZoneId] = useState('');
  const [newShelf, setNewShelf] = useState({ code: '', maxWeight: '' });
  const [creatingShelf, setCreatingShelf] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [shipRes, statsRes] = await Promise.all([
        fetch('/api/master-awbs?limit=100&scope=warehouse', { cache: 'no-store' }),
        fetch('/api/dashboard/warehouse', { cache: 'no-store' }),
      ]);
      if (shipRes.ok) { const j = await shipRes.json(); setShipments(j.data || []); }
      if (statsRes.ok) { const j = await statsRes.json(); if (j.success) setStats(j.data); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keep counters fresh when returning to the tab.
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

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

  const loadManageZones = async () => {
    setManageLoading(true);
    setManageError('');
    try {
      const res = await fetch('/api/warehouse/zones', { cache: 'no-store' });
      const j = await res.json();
      if (res.ok) setManageZones(j.data || []);
      else setManageError(j.error || 'Failed to load storage zones');
    } catch { setManageError('Failed to load storage zones'); }
    finally { setManageLoading(false); }
  };

  const openManageStorage = () => {
    setManageOpen(true);
    setShelfZoneId('');
    setNewShelf({ code: '', maxWeight: '' });
    setNewZone({ code: '', name: '', type: 'STORAGE', capacity: '' });
    loadManageZones();
  };

  const handleCreateZone = async () => {
    if (!newZone.code.trim() || !newZone.name.trim() || creatingZone) return;
    setCreatingZone(true);
    setManageError('');
    try {
      const res = await fetch('/api/warehouse/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newZone.code.trim().toUpperCase(),
          name: newZone.name.trim(),
          type: newZone.type,
          capacity: newZone.capacity ? parseInt(newZone.capacity) : 0,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setManageError(j.error || 'Failed to create zone'); return; }
      setNewZone({ code: '', name: '', type: 'STORAGE', capacity: '' });
      await loadManageZones();
    } catch { setManageError('Failed to create zone'); }
    finally { setCreatingZone(false); }
  };

  const handleCreateShelf = async () => {
    if (!shelfZoneId || !newShelf.code.trim() || creatingShelf) return;
    setCreatingShelf(true);
    setManageError('');
    try {
      const res = await fetch('/api/warehouse/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId: shelfZoneId,
          code: newShelf.code.trim().toUpperCase(),
          maxWeight: newShelf.maxWeight ? parseFloat(newShelf.maxWeight) : 0,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setManageError(j.error || 'Failed to create shelf'); return; }
      setNewShelf({ code: '', maxWeight: '' });
      await loadManageZones();
    } catch { setManageError('Failed to create shelf'); }
    finally { setCreatingShelf(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouse Operations" description="Manage warehouse inventory, storage, and dispatch"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Warehouse' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openManageStorage}>
              <Settings2 className="mr-1 h-4 w-4" /> Manage Storage
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
          </div>
        } />

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

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Storage Zones & Shelves</DialogTitle>
            <DialogDescription>
              Create warehouse zones and storage locations. Shelves become selectable when assigning cargo.
            </DialogDescription>
          </DialogHeader>

          {manageError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {manageError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Create zone */}
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
                <Warehouse className="h-3.5 w-3.5" /> New Zone
              </h4>
              <div className="space-y-2">
                <Input value={newZone.code} onChange={e => setNewZone(z => ({ ...z, code: e.target.value }))} placeholder="Code (e.g. DAR-A)" className="h-8 text-sm" />
                <Input value={newZone.name} onChange={e => setNewZone(z => ({ ...z, name: e.target.value }))} placeholder="Zone name" className="h-8 text-sm" />
                <div className="flex gap-2">
                  <select value={newZone.type} onChange={e => setNewZone(z => ({ ...z, type: e.target.value }))}
                    className="h-8 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                    {['STORAGE', 'COLD', 'HAZMAT', 'FRAGILE', 'OVERSIZE', 'QUARANTINE'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Input type="number" value={newZone.capacity} onChange={e => setNewZone(z => ({ ...z, capacity: e.target.value }))} placeholder="Capacity" className="h-8 w-24 text-sm" />
                </div>
                <Button size="sm" className="w-full" onClick={handleCreateZone} disabled={creatingZone || !newZone.code.trim() || !newZone.name.trim()}>
                  {creatingZone ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                  {creatingZone ? 'Creating...' : 'Create Zone'}
                </Button>
              </div>
            </div>

            {/* Create shelf */}
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
                <Layers className="h-3.5 w-3.5" /> New Shelf / Location
              </h4>
              <div className="space-y-2">
                <select value={shelfZoneId} onChange={e => setShelfZoneId(e.target.value)}
                  className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  <option value="">Select zone...</option>
                  {manageZones.map((z: any) => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
                </select>
                <Input value={newShelf.code} onChange={e => setNewShelf(s => ({ ...s, code: e.target.value }))} placeholder="Shelf code (e.g. A-03-01)" className="h-8 text-sm" />
                <Input type="number" value={newShelf.maxWeight} onChange={e => setNewShelf(s => ({ ...s, maxWeight: e.target.value }))} placeholder="Max weight (kg)" className="h-8 text-sm" />
                <Button size="sm" className="w-full" onClick={handleCreateShelf} disabled={creatingShelf || !shelfZoneId || !newShelf.code.trim()}>
                  {creatingShelf ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                  {creatingShelf ? 'Creating...' : 'Create Shelf'}
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {manageLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading zones...
              </div>
            ) : manageZones.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No zones yet. Create the first zone above.</p>
            ) : manageZones.map((z: any) => (
              <div key={z.id} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{z.code} — {z.name}</p>
                    <p className="text-xs text-gray-500">{z.type} · capacity {z.capacity} · {z.locations?.length || 0} shelves</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShelfZoneId(z.id)}>
                    <Plus className="mr-1 h-3 w-3" /> Add Shelf
                  </Button>
                </div>
                {z.locations?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {z.locations.map((l: any) => (
                      <span key={l.id} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {l.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
