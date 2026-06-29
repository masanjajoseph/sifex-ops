'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, RefreshCw, Pen, CheckCircle, XCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';

interface DeliveryItem {
  id: string;
  houseAWBId: string;
  masterAWBId: string;
  status: string;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  rider: { user: { firstName: string; lastName: string } };
  createdAt: string;
  houseAWB?: { houseAWBNumber: string; trackingNumber: string; pieces: number; cargoStatus: string };
}

interface DeliveryNoteItem {
  id: string;
  houseAWBId: string;
  deliveryType: string;
  status: string;
  recipientName: string;
  recipientPhone: string;
  relation: string;
  representativeName?: string;
  signedAt?: string;
  createdAt: string;
  houseAWB?: { houseAWBNumber: string; trackingNumber: string };
  createdBy?: { firstName: string; lastName: string };
}

export default function DeliveryPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [notes, setNotes] = useState<DeliveryNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'pickup' | 'completed'>('active');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [delRes, noteRes] = await Promise.all([
        fetch('/api/deliveries?limit=50'),
        fetch('/api/delivery-notes?limit=50'),
      ]);
      if (delRes.ok) { const j = await delRes.json(); setDeliveries(j.data || []); }
      if (noteRes.ok) { const j = await noteRes.json(); setNotes(j.data || []); }
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeDeliveries = useMemo(() => deliveries.filter(d => d.status === 'ASSIGNED' || d.status === 'IN_PROGRESS'), [deliveries]);
  const completedDeliveries = useMemo(() => deliveries.filter(d => d.status === 'DELIVERED' || d.status === 'FAILED'), [deliveries]);
  const pickupNotes = useMemo(() => notes.filter(n => n.deliveryType === 'PICKUP'), [notes]);
  const signedNotes = useMemo(() => notes.filter(n => n.status === 'SIGNED'), [notes]);

  const stats = useMemo(() => ({
    active: activeDeliveries.length,
    inProgress: deliveries.filter(d => d.status === 'IN_PROGRESS').length,
    assigned: deliveries.filter(d => d.status === 'ASSIGNED').length,
    completed: completedDeliveries.length,
    pickups: pickupNotes.length,
    signed: signedNotes.length,
  }), [activeDeliveries, completedDeliveries, pickupNotes, signedNotes, deliveries]);

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Management" description="Manage last-mile delivery, rider dispatch, and customer pickups"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Delivery' }]}
        action={<Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button>} />

      <div className="grid gap-4 sm:grid-cols-6">
        <StatCard label="Active Deliveries" value={stats.active} icon={<Truck className="h-5 w-5" />} />
        <StatCard label="In Progress" value={stats.inProgress} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Pending Assign" value={stats.assigned} icon={<Truck className="h-5 w-5" />} />
        <StatCard label="Completed" value={stats.completed} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Pickups Today" value={stats.pickups} icon={<Pen className="h-5 w-5" />} />
        <StatCard label="Signed Notes" value={stats.signed} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
        <button onClick={() => setTab('active')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${tab === 'active' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Active Deliveries ({activeDeliveries.length})</button>
        <button onClick={() => setTab('pickup')} className={`px-4 py-2 text-sm font-medium ${tab === 'pickup' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Pickup Notes ({pickupNotes.length})</button>
        <button onClick={() => setTab('completed')} className={`px-4 py-2 text-sm font-medium rounded-r-lg ${tab === 'completed' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Completed ({completedDeliveries.length})</button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : tab === 'active' ? (
        activeDeliveries.length === 0 ? <EmptyState icon={<Truck className="h-12 w-12" />} title="No active deliveries" description="Awaiting delivery assignments." />
        : <DataTable columns={[
          { header: 'HAWB', accessorKey: 'houseAWB' as const, cell: (i: any) => i.getValue()?.houseAWBNumber || '-' },
          { header: 'Recipient', accessorKey: 'recipientName' as const, cell: (i: any) => <div><p className="text-sm font-medium">{i.getValue() || '-'}</p>{i.row.original.recipientPhone && <p className="text-xs text-gray-400">{i.row.original.recipientPhone}</p>}</div> },
          { header: 'Address', accessorKey: 'deliveryAddress' as const, cell: (i: any) => <span className="text-sm truncate max-w-[200px] block">{i.getValue() || '-'}</span> },
          { header: 'Rider', accessorKey: 'rider' as const, cell: (i: any) => i.getValue() ? `${i.getValue().user.firstName} ${i.getValue().user.lastName}` : 'Unassigned' },
          { header: 'Status', accessorKey: 'status' as const, cell: (i: any) => <StatusBadge status={i.getValue() === 'IN_PROGRESS' ? 'info' : 'warning'} label={i.getValue().replace(/_/g, ' ')} /> },
        ]} data={activeDeliveries} pageSize={15} />
      ) : tab === 'pickup' ? (
        pickupNotes.length === 0 ? <EmptyState icon={<Pen className="h-12 w-12" />} title="No pickup notes" description="Pickup notes are created when customers collect cargo at the office." />
        : <DataTable columns={[
          { header: 'HAWB', accessorKey: 'houseAWB' as const, cell: (i: any) => i.getValue()?.houseAWBNumber || '-' },
          { header: 'Customer', accessorKey: 'recipientName' as const, cell: (i: any) => <div><p className="text-sm font-medium">{i.getValue()}</p>{i.row.original.recipientPhone && <p className="text-xs text-gray-400">{i.row.original.recipientPhone}</p>}</div> },
          { header: 'Relation', accessorKey: 'relation' as const, cell: (i: any) => <span className="text-xs">{i.getValue()}{i.getValue() === 'REPRESENTATIVE' && i.row.original.representativeName ? ` (${i.row.original.representativeName})` : ''}</span> },
          { header: 'Status', accessorKey: 'status' as const, cell: (i: any) => <StatusBadge status={i.getValue() === 'SIGNED' ? 'success' : 'pending'} label={i.getValue()} /> },
          { header: 'Date', accessorKey: 'createdAt' as const, cell: (i: any) => new Date(i.getValue()).toLocaleDateString() },
        ]} data={pickupNotes} pageSize={15} />
      ) : (
        completedDeliveries.length === 0 && signedNotes.length === 0 ? <EmptyState icon={<CheckCircle className="h-12 w-12" />} title="No completed deliveries" description="Completed deliveries will appear here." />
        : <DataTable columns={[
          { header: 'Type', accessorKey: 'deliveryType' as const, cell: (i: any) => <StatusBadge status={i.getValue() === 'PICKUP' ? 'info' : 'success'} label={i.getValue()} /> },
          { header: 'HAWB', accessorKey: 'houseAWB' as const, cell: (i: any) => i.getValue()?.houseAWBNumber || '-' },
          { header: 'Recipient', accessorKey: 'recipientName' as const },
          { header: 'Signed', accessorKey: 'signedAt' as const, cell: (i: any) => i.getValue() ? new Date(i.getValue()).toLocaleDateString() : '-' },
          { header: 'Status', accessorKey: 'status' as const, cell: (i: any) => <StatusBadge status={i.getValue() === 'SIGNED' ? 'success' : 'info'} label={i.getValue()} /> },
        ]} data={signedNotes} pageSize={15} />
      )}
    </div>
  );
}
