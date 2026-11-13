'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, RefreshCw, User, Play, Map, Phone,
  MessageSquare, FileText, Printer, Pen, CheckCircle, Calendar, Repeat,
  XCircle, MapPin, Clock, Package, DollarSign, Loader2, AlertCircle
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useWorkflowQueueSubscription } from '@/hooks/useRealtimeSubscription';

interface DashboardStats {
  waitingAssignment: number;
  assigned: number;
  started: number;
  deliveredToday: number;
  totalActive: number;
  cancelled: number;
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'COMPLETED': case 'DELIVERED': return 'success' as const;
    case 'STARTED': case 'ARRIVED': return 'info' as const;
    case 'ASSIGNED': return 'warning' as const;
    case 'WAITING_ASSIGNMENT': return 'pending' as const;
    case 'CANCELLED': return 'error' as const;
    default: return 'pending' as const;
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'WAITING_ASSIGNMENT': return 'Waiting Assignment';
    case 'ASSIGNED': return 'Assigned';
    case 'STARTED': return 'Started';
    case 'ARRIVED': return 'Arrived';
    case 'DELIVERED': return 'Delivered';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    default: return s.replace(/_/g, ' ');
  }
};

const priorityColor = (p: string) => {
  switch (p) {
    case 'HIGH': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
    case 'NORMAL': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
    case 'LOW': return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export default function DeliveryPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    waitingAssignment: 0, assigned: 0, started: 0,
    deliveredToday: 0, totalActive: 0, cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'waiting' | 'active' | 'completed'>('waiting');
  const [riders, setRiders] = useState<any[]>([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRes, statsRes] = await Promise.all([
        fetch('/api/delivery-tasks?limit=100', { cache: 'no-store' }),
        fetch('/api/dashboard/delivery', { cache: 'no-store' }),
      ]);
      if (taskRes.ok) { const j = await taskRes.json(); setTasks(j.data || []); }
      if (statsRes.ok) { const j = await statsRes.json(); if (j.success) setStats(j.data); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh counters when the operator returns to the tab so stats never look stale.
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

  useWorkflowQueueSubscription('delivery', fetchData);

  const waiting = useMemo(() => tasks.filter((d: any) => d.status === 'WAITING_ASSIGNMENT'), [tasks]);
  const active = useMemo(() => tasks.filter((d: any) => ['ASSIGNED', 'STARTED', 'ARRIVED'].includes(d.status)), [tasks]);
  const completed = useMemo(() => tasks.filter((d: any) => ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(d.status)), [tasks]);

  const handleAction = async (action: string, entityId: string) => {
    try {
      await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'DeliveryTask', entityId, action }),
      });
      fetchData();
    } catch {}
  };

  const fetchRiders = useCallback(async () => {
    setRidersLoading(true);
    try {
      const res = await fetch('/api/riders?isActive=true&limit=100', { cache: 'no-store' });
      if (res.ok) { const j = await res.json(); setRiders(j.data || []); }
    } catch {} finally { setRidersLoading(false); }
  }, []);

  const openAssignRider = (taskId: string) => {
    setAssignTaskId(taskId);
    setSelectedRiderId('');
    setAssignError('');
    fetchRiders();
  };

  const activeTaskCount = (riderId: string) =>
    tasks.filter(t => t.assignedRiderId === riderId && ['ASSIGNED', 'STARTED', 'ARRIVED'].includes(t.status)).length;

  const handleAssignRider = async () => {
    if (!assignTaskId || !selectedRiderId || assignSaving) return;
    setAssignSaving(true);
    setAssignError('');
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'DeliveryTask',
          entityId: assignTaskId,
          action: 'ASSIGN_RIDER',
          metadata: { riderId: selectedRiderId },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setAssignError(j.error || j.message || 'Failed to assign rider');
        return;
      }
      setAssignTaskId(null);
      setSelectedRiderId('');
      await fetchData();
    } catch {
      setAssignError('Failed to assign rider');
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Task Management" description="Manage delivery tasks, rider dispatch, and last-mile delivery"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Delivery' }]}
        action={<Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button>} />

      <div className="grid gap-4 sm:grid-cols-6">
        <StatCard label="Waiting Assignment" value={stats.waitingAssignment} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Assigned" value={stats.assigned} icon={<User className="h-5 w-5" />} />
        <StatCard label="Started" value={stats.started} icon={<Play className="h-5 w-5" />} />
        <StatCard label="Delivered Today" value={stats.deliveredToday} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Active" value={stats.totalActive} icon={<Truck className="h-5 w-5" />} />
        <StatCard label="Cancelled" value={stats.cancelled} icon={<XCircle className="h-5 w-5" />} />
      </div>

      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
        <button onClick={() => setTab('waiting')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${tab === 'waiting' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Waiting ({waiting.length})</button>
        <button onClick={() => setTab('active')} className={`px-4 py-2 text-sm font-medium ${tab === 'active' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Active ({active.length})</button>
        <button onClick={() => setTab('completed')} className={`px-4 py-2 text-sm font-medium rounded-r-lg ${tab === 'completed' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Completed ({completed.length})</button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : tab === 'waiting' ? (
        waiting.length === 0 ? <EmptyState icon={<Package className="h-12 w-12" />} title="No tasks waiting" description="All delivery tasks have been assigned." />
        : <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {waiting.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{d.taskNumber}</p>
                    {d.houseAWB && <span className="text-xs text-gray-500">{d.houseAWB.houseAWBNumber}</span>}
                    {d.invoiceNumber && (
                      <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                        <DollarSign className="h-3 w-3" /> {d.invoiceNumber}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${priorityColor(d.priority)}`}>{d.priority}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {d.customerName || 'Unknown customer'}
                    {d.deliveryAddress && ` · ${d.deliveryAddress}`}
                    {d.customerPhone && ` · ${d.customerPhone}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => openAssignRider(d.id)}>
                    <User className="mr-1 h-3 w-3" /> Assign Rider
                  </Button>
                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('ASSIGN_RIDER', d.id)}>
                    <User className="mr-1 h-3 w-3" /> Auto-Assign
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction('CANCEL_TASK', d.id)}>
                    <XCircle className="mr-1 h-3 w-3" /> Cancel
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(`/workspace/delivery/${d.id}/print`, '_blank')}>
                    <Printer className="mr-1 h-3 w-3" /> Print
                  </Button>
                </div>
              </div>
            ))}
          </div>
      ) : tab === 'active' ? (
        active.length === 0 ? <EmptyState icon={<Truck className="h-12 w-12" />} title="No active deliveries" description="Awaiting delivery assignments." />
        : <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {active.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{d.taskNumber}</p>
                    {d.houseAWB && <span className="text-xs text-gray-500">{d.houseAWB.houseAWBNumber}</span>}
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${priorityColor(d.priority)}`}>{d.priority}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {d.assignedRider?.user ? `${d.assignedRider.user.firstName} ${d.assignedRider.user.lastName}` : 'Unassigned'}
                    {d.customerName && ` → ${d.customerName}`}
                    {d.deliveryAddress && ` · ${d.deliveryAddress}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <StatusBadge status={statusVariant(d.status)} label={statusLabel(d.status)} />
                  {d.status === 'ASSIGNED' && (
                    <>
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('START_DELIVERY', d.id)}>
                        <Play className="mr-1 h-3 w-3" /> Start
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAssignRider(d.id)}>
                        <Repeat className="mr-1 h-3 w-3" /> Change Rider
                      </Button>
                    </>
                  )}
                  {d.status === 'STARTED' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction('ARRIVE_AT_DESTINATION', d.id)}>
                        <MapPin className="mr-1 h-3 w-3" /> Arrive
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(`/workspace/tracking?delivery=${d.id}`, '_blank')}><Map className="mr-1 h-3 w-3" /> Track</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                        const phone = d.assignedRider?.user?.phone || d.assignedRider?.phone;
                        if (phone) window.open(`tel:${phone}`);
                      }}><Phone className="mr-1 h-3 w-3" /> Contact</Button>
                    </>
                  )}
                  {d.status === 'ARRIVED' && (
                    <>
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('CONFIRM_DELIVERY', d.id)}>
                        <CheckCircle className="mr-1 h-3 w-3" /> Confirm Delivery
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                        const phone = d.assignedRider?.user?.phone || d.assignedRider?.phone || d.customerPhone;
                        if (phone) window.open(`tel:${phone}`);
                      }}><Phone className="mr-1 h-3 w-3" /> Contact</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
      ) : (
        completed.length === 0 ? <EmptyState icon={<CheckCircle className="h-12 w-12" />} title="No completed deliveries" description="Completed deliveries will appear here." />
        : <DataTable columns={[
          { header: 'Task #', accessorKey: 'taskNumber' as const },
          { header: 'HAWB', accessorKey: 'houseAWB' as const, cell: (i: any) => i.getValue()?.houseAWBNumber || '-' },
          { header: 'Customer', accessorKey: 'customerName' as const },
          { header: 'Rider', accessorKey: 'assignedRider' as const, cell: (i: any) => {
            const r = i.getValue();
            return r?.user ? `${r.user.firstName} ${r.user.lastName}` : '-';
          }},
          { header: 'Status', accessorKey: 'status' as const, cell: (i: any) => <StatusBadge status={statusVariant(i.getValue())} label={statusLabel(i.getValue())} /> },
          { header: 'Delivered', accessorKey: 'deliveredAt' as const, cell: (i: any) => i.getValue() ? new Date(i.getValue()).toLocaleDateString() : '-' },
        ]} data={completed} pageSize={15} />
      )}

      <Dialog open={!!assignTaskId} onOpenChange={(v) => { if (!v && !assignSaving) { setAssignTaskId(null); setSelectedRiderId(''); setAssignError(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Rider</DialogTitle>
            <DialogDescription>
              Choose an active rider for this delivery task. Active workload is shown next to each rider.
            </DialogDescription>
          </DialogHeader>

          {assignError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {assignError}
            </div>
          )}

          {ridersLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading riders...
            </div>
          ) : riders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-600">
              No active riders found. Create a rider from HR / Users first.
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {riders.map((r: any) => {
                const name = r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Unnamed rider';
                const active = activeTaskCount(r.id);
                const checked = selectedRiderId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRiderId(r.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      checked
                        ? 'border-[#d00020] bg-red-50 dark:border-red-500 dark:bg-red-900/20'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {r.vehicleType}{r.vehicleReg ? ` · ${r.vehicleReg}` : ''}
                        {r.phone || r.user?.phone ? ` · ${r.phone || r.user?.phone}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      active > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {active} active
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={assignSaving} onClick={() => { setAssignTaskId(null); setSelectedRiderId(''); setAssignError(''); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#d00020] text-white hover:bg-[#d00020]/90"
              onClick={handleAssignRider}
              disabled={!selectedRiderId || assignSaving}
            >
              {assignSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <User className="mr-1 h-3 w-3" />}
              {assignSaving ? 'Assigning...' : 'Assign Rider'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
