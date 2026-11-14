'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  PackageOpen, RefreshCw, Truck, CheckCircle, AlertTriangle,
  FileCheck, Package, Warehouse, SearchX, Plane, Clock,
  DollarSign, FileText, XCircle, Loader2, Search
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useWorkflowQueueSubscription } from '@/hooks/useRealtimeSubscription';

interface ImportItem {
  id: string;
  awbNumber: string;
  trackingNumber: string;
  cargoStatus: string;
  workflowStatus: string;
  awbPieces: number;
  awbWeight: number;
  originStation: { code: string; name: string } | null;
  destinationStation: { code: string; name: string } | null;
  createdAt: string;
}

interface DashboardStats {
  preArrival: number;
  terminalArrived: number;
  pendingInspection: number;
  customsPending: number;
  readyForWarehouse: number;
  exceptionCount: number;
  customsHold: number;
  totalImport: number;
  releasedToday: number;
  manifestedCount: number;
  avgProcessingTime: number;
  receivedMonth: number;
}

const PIPELINE_COLUMNS = [
  { key: 'preArrival', label: 'Pre-Arrival', statuses: ['PRE_ARRIVAL', 'IN_TRANSIT', 'DISPATCHED'], icon: Plane, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'arrived', label: 'Arrived', statuses: ['ARRIVED', 'TERMINAL_ARRIVED'], icon: Truck, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { key: 'clearance', label: 'Under Clearance', statuses: ['UNDER_CLEARANCE', 'RECEIVED', 'DOCUMENTS_VERIFIED', 'PIECES_VERIFIED', 'WEIGHT_VERIFIED', 'DAMAGE_INSPECTED', 'CUSTOMS_SUBMITTED', 'CUSTOMS_ASSESSED', 'CUSTOMS_PAID', 'CUSTOMS_INSPECTION'], icon: FileCheck, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { key: 'released', label: 'Released', statuses: ['RELEASED', 'CUSTOMS_CLEARED'], icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'warehouse', label: 'Warehouse', statuses: ['WAREHOUSE', 'WAREHOUSE_RECEIVING', 'MANIFEST_VERIFIED', 'MAWB_RECEIVED'], icon: Warehouse, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'delivery', label: 'Delivery', statuses: ['DELIVERY'], icon: Truck, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  { key: 'exception', label: 'Exceptions', statuses: ['EXCEPTION', 'CUSTOMS_HOLD'], icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
];

// One-click advance used on the pipeline cards, so the operator never has to
// open the detail page just to move the shipment to the next stage.
const NEXT_STEP: Record<string, { label: string; action: string }> = {
  PRE_ARRIVAL: { label: 'Confirm Arrival', action: 'CONFIRM_ARRIVAL' },
  IN_TRANSIT: { label: 'Confirm Arrival', action: 'CONFIRM_ARRIVAL' },
  DISPATCHED: { label: 'Confirm Arrival', action: 'CONFIRM_ARRIVAL' },
  ARRIVED: { label: 'Start Clearance', action: 'START_CLEARANCE' },
  UNDER_CLEARANCE: { label: 'Release Cargo', action: 'RELEASE_CLEARANCE' },
  RELEASED: { label: 'Receive Into Warehouse', action: 'RECEIVE_INTO_WAREHOUSE' },
  WAREHOUSE: { label: 'Open Warehouse', action: 'GOTO_WAREHOUSE' },
};

const statusVariant = (s: string) => {
  switch (s) {
    case 'RELEASED': case 'DELIVERED': case 'COMPLETED': case 'CUSTOMS_CLEARED': case 'WAREHOUSE': return 'success' as const;
    case 'ARRIVED': case 'TERMINAL_ARRIVED': case 'RECEIVED': case 'IN_TRANSIT': case 'DELIVERY': return 'info' as const;
    case 'PRE_ARRIVAL': case 'MANIFEST_VERIFIED': case 'MAWB_RECEIVED': return 'pending' as const;
    case 'UNDER_CLEARANCE': case 'DOCUMENTS_VERIFIED': case 'PIECES_VERIFIED': case 'WEIGHT_VERIFIED': case 'DAMAGE_INSPECTED': return 'warning' as const;
    case 'CUSTOMS_SUBMITTED': case 'CUSTOMS_ASSESSED': case 'CUSTOMS_PAID': case 'CUSTOMS_INSPECTION': return 'warning' as const;
    case 'EXCEPTION': case 'CUSTOMS_HOLD': return 'error' as const;
    default: return 'pending' as const;
  }
};

export default function ImportPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [data, setData] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [reportEntity, setReportEntity] = useState<{ id: string; type: 'damage' | 'missing' } | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [reportPieces, setReportPieces] = useState('');
  const [reportSaving, setReportSaving] = useState(false);
  const [verifyEntity, setVerifyEntity] = useState<ImportItem | null>(null);
  const [verifyPieces, setVerifyPieces] = useState('');
  const [verifyWeight, setVerifyWeight] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [completeInspection, setCompleteInspection] = useState(true);
  const [verifyRunning, setVerifyRunning] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyProgress, setVerifyProgress] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100', scope: 'import' });
      if (selectedStatus) params.set('status', selectedStatus);
      if (search) params.set('search', search);
      const dataRes = await fetch(`/api/master-awbs?${params}`, { cache: 'no-store' });
      if (dataRes.ok) { const j = await dataRes.json(); setData(j.data || []); }
    } catch {} finally {
      setLoading(false);
    }
  }, [search, selectedStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh counters when the operator returns to the tab.
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

  useWorkflowQueueSubscription('import', fetchData);

  const handleAction = async (action: string, entityId: string) => {
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'MasterAWB', entityId, action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        window.alert(j?.error || 'Action could not be completed');
        return;
      }
      fetchData();
    } catch {}
  };

  const handleReportSubmit = async () => {
    if (!reportEntity || reportSaving) return;
    setReportSaving(true);
    try {
      await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'MasterAWB',
          entityId: reportEntity.id,
          action: reportEntity.type === 'damage' ? 'REPORT_DAMAGE' : 'REPORT_MISSING',
          metadata: {
            notes: reportDescription,
            pieces: reportPieces ? parseInt(reportPieces) : undefined,
            reportType: reportEntity.type,
          },
        }),
      });
      setReportEntity(null);
      setReportDescription('');
      setReportPieces('');
      fetchData();
    } catch {} finally {
      setReportSaving(false);
    }
  };

  /**
   * The verification sub-workflow can be entered from RECEIVED (docs or pieces
   * first), DOCUMENTS_VERIFIED, or PIECES_VERIFIED. Return the transitions that
   * are still pending so the panel can run them in a single click.
   */
  const pendingVerificationSteps = (status: string): { action: string; label: string }[] => {
    switch (status) {
      case 'RECEIVED':
        return [
          { action: 'VERIFY_DOCUMENTS', label: 'Documents verified' },
          { action: 'VERIFY_PIECES', label: 'Pieces counted' },
          { action: 'VERIFY_WEIGHT', label: 'Weight verified' },
        ];
      case 'DOCUMENTS_VERIFIED':
        return [
          { action: 'VERIFY_PIECES', label: 'Pieces counted' },
          { action: 'VERIFY_WEIGHT', label: 'Weight verified' },
        ];
      case 'PIECES_VERIFIED':
        return [
          { action: 'VERIFY_DOCUMENTS', label: 'Documents verified' },
          { action: 'VERIFY_WEIGHT', label: 'Weight verified' },
        ];
      default:
        return [];
    }
  };

  const openVerify = (item: ImportItem) => {
    setVerifyEntity(item);
    setVerifyPieces(String(item.awbPieces ?? ''));
    setVerifyWeight(String(item.awbWeight ?? ''));
    setVerifyNotes('');
    setCompleteInspection(true);
    setVerifyError('');
    setVerifyProgress('');
  };

  const closeVerify = () => {
    if (verifyRunning) return;
    setVerifyEntity(null);
    setVerifyError('');
    setVerifyProgress('');
  };

  const handleVerifySubmit = async () => {
    if (!verifyEntity || verifyRunning) return;
    const steps = pendingVerificationSteps(verifyEntity.workflowStatus);
    if (steps.length === 0) {
      setVerifyError('Verification is already complete for this shipment.');
      return;
    }

    const runSteps = completeInspection
      ? [...steps, { action: 'COMPLETE_INSPECTION', label: 'Inspection completed' }]
      : steps;

    setVerifyRunning(true);
    setVerifyError('');
    try {
      for (const step of runSteps) {
        setVerifyProgress(step.label);
        const res = await fetch('/api/workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'MasterAWB',
            entityId: verifyEntity.id,
            action: step.action,
            metadata: {
              verifiedPieces: verifyPieces ? parseInt(verifyPieces) : undefined,
              verifiedWeight: verifyWeight ? parseFloat(verifyWeight) : undefined,
              notes: verifyNotes || undefined,
            },
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setVerifyError(`Could not complete "${step.label}": ${j.error || 'workflow rejected the transition'}`);
          return;
        }
      }
      setVerifyEntity(null);
      setVerifyProgress('');
      await fetchData();
    } catch {
      setVerifyError('Verification failed. Please try again.');
    } finally {
      setVerifyRunning(false);
    }
  };

  const getStatusActions = (item: ImportItem) => {
    const s = item.workflowStatus;
    if (s === 'PRE_ARRIVAL' || s === 'IN_TRANSIT' || s === 'DISPATCHED') return (
      <div className="flex gap-1">
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('CONFIRM_ARRIVAL', item.id)}>
          <Truck className="mr-1 h-3 w-3" /> Confirm Arrival
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/import/${item.id}`)}>
          View
        </Button>
      </div>
    );
    if (s === 'ARRIVED') return (
      <div className="flex gap-1">
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('START_CLEARANCE', item.id)}>
          <FileText className="mr-1 h-3 w-3" /> Start Clearance
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/import/${item.id}`)}>
          Detail
        </Button>
      </div>
    );
    if (s === 'UNDER_CLEARANCE') return (
      <div className="flex gap-1">
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('RELEASE_CLEARANCE', item.id)}>
          <CheckCircle className="mr-1 h-3 w-3" /> Release Cargo
        </Button>
        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleAction('REPORT_HOLD', item.id)}>
          <XCircle className="mr-1 h-3 w-3" /> Hold
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/import/${item.id}`)}>
          Detail
        </Button>
      </div>
    );
    if (s === 'RELEASED') return (
      <div className="flex gap-1">
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('RECEIVE_INTO_WAREHOUSE', item.id)}>
          <Warehouse className="mr-1 h-3 w-3" /> Receive Into Warehouse
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/import/${item.id}`)}>
          Detail
        </Button>
      </div>
    );
    if (s === 'WAREHOUSE') return (
      <div className="flex gap-1">
        <span className="flex items-center gap-1 text-xs text-green-400">
          <CheckCircle className="h-3 w-3" /> In Warehouse
        </span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.push('/workspace/warehouse')}>
          <Warehouse className="mr-1 h-3 w-3" /> Warehouse
        </Button>
      </div>
    );
    if (s === 'DELIVERY') return (
      <div className="flex gap-1">
        <span className="flex items-center gap-1 text-xs text-teal-400">
          <Truck className="h-3 w-3" /> Delivery
        </span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.push('/workspace/delivery')}>
          <Truck className="mr-1 h-3 w-3" /> Delivery
        </Button>
      </div>
    );
    if (s === 'TERMINAL_ARRIVED' || s === 'MANIFEST_VERIFIED' || s === 'MAWB_RECEIVED') return (
      <div className="flex gap-1">
        {s === 'TERMINAL_ARRIVED' && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('VERIFY_MANIFEST', item.id)}>
            <FileCheck className="mr-1 h-3 w-3" /> Verify Manifest
          </Button>
        )}
        {s === 'MANIFEST_VERIFIED' && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('RECEIVE_MAWB', item.id)}>
            <FileText className="mr-1 h-3 w-3" /> Receive MAWB
          </Button>
        )}
        {s === 'MAWB_RECEIVED' && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('RECEIVE_HAWBS', item.id)}>
            <Package className="mr-1 h-3 w-3" /> Receive HAWBs
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/import/${item.id}`)}>
          Open
        </Button>
      </div>
    );
    if (s === 'RECEIVED' || s === 'DOCUMENTS_VERIFIED' || s === 'PIECES_VERIFIED' || s === 'WEIGHT_VERIFIED' || s === 'DAMAGE_INSPECTED') return (
      <div className="flex gap-1 flex-wrap">
        {['RECEIVED', 'DOCUMENTS_VERIFIED', 'PIECES_VERIFIED'].includes(s) && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => openVerify(item)}>
            <FileCheck className="mr-1 h-3 w-3" /> Verify Cargo
          </Button>
        )}
        {s === 'WEIGHT_VERIFIED' && (
          <>
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('COMPLETE_INSPECTION', item.id)}>
              <CheckCircle className="mr-1 h-3 w-3" /> Complete Inspection
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction('SUBMIT_CUSTOMS', item.id)}>
              <FileText className="mr-1 h-3 w-3" /> Customs
            </Button>
          </>
        )}
        {s === 'DAMAGE_INSPECTED' && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('SUBMIT_CUSTOMS', item.id)}>
            <FileText className="mr-1 h-3 w-3" /> Submit Customs
          </Button>
        )}
        {['RECEIVED', 'DOCUMENTS_VERIFIED', 'PIECES_VERIFIED'].includes(s) && (
          <>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { setReportEntity({ id: item.id, type: 'damage' }); setReportDescription(''); setReportPieces(''); }}>
              <AlertTriangle className="mr-1 h-3 w-3" /> Damage
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { setReportEntity({ id: item.id, type: 'missing' }); setReportDescription(''); setReportPieces(''); }}>
              <SearchX className="mr-1 h-3 w-3" /> Missing
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/import/${item.id}`)}>
          Detail
        </Button>
      </div>
    );
    if (s === 'CUSTOMS_SUBMITTED' || s === 'CUSTOMS_ASSESSED' || s === 'CUSTOMS_PAID' || s === 'CUSTOMS_INSPECTION' || s === 'CUSTOMS_HOLD') return (
      <div className="flex gap-1">
        {s === 'CUSTOMS_SUBMITTED' && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('RECORD_ASSESSMENT', item.id)}>
            <DollarSign className="mr-1 h-3 w-3" /> Assessment
          </Button>
        )}
        {s === 'CUSTOMS_ASSESSED' && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('RECORD_DUTY_PAYMENT', item.id)}>
            <DollarSign className="mr-1 h-3 w-3" /> Record Payment
          </Button>
        )}
        {s === 'CUSTOMS_PAID' && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction('SCHEDULE_INSPECTION', item.id)}>
            <Clock className="mr-1 h-3 w-3" /> Schedule Inspection
          </Button>
        )}
        {s === 'CUSTOMS_INSPECTION' && (
          <>
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('CUSTOMS_RELEASED', item.id)}>
              <CheckCircle className="mr-1 h-3 w-3" /> Release
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleAction('REPORT_HOLD', item.id)}>
              <XCircle className="mr-1 h-3 w-3" /> Hold
            </Button>
          </>
        )}
        {s === 'CUSTOMS_HOLD' && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('RESOLVE_HOLD', item.id)}>
            <CheckCircle className="mr-1 h-3 w-3" /> Resolve Hold
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/import/${item.id}`)}>
          Detail
        </Button>
      </div>
    );
    if (s === 'CUSTOMS_CLEARED' || s === 'WAREHOUSE_RECEIVING') return (
      <div className="flex gap-1">
        {s === 'CUSTOMS_CLEARED' && (
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('RECEIVE_INTO_WAREHOUSE', item.id)}>
            <Warehouse className="mr-1 h-3 w-3" /> Release to Warehouse
          </Button>
        )}
        {s === 'WAREHOUSE_RECEIVING' && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle className="h-3 w-3" /> With Warehouse
          </span>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/master-awb/${item.id}`)}>
          View
        </Button>
      </div>
    );
    if (s === 'EXCEPTION') return (
      <div className="flex gap-1">
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('RESOLVE_EXCEPTION', item.id)}>
          <CheckCircle className="mr-1 h-3 w-3" /> Resolve
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/import/${item.id}`)}>
          Details
        </Button>
      </div>
    );
    return null;
  };

  const pipelineData = useMemo(() => {
    return PIPELINE_COLUMNS.map(col => {
      const items = data.filter(d => col.statuses.includes(d.workflowStatus));
      return { ...col, items, count: items.length };
    });
  }, [data]);

  const stageCounts = useMemo(() => {
    const count = (keys: string[]) => data.filter(d => keys.includes(d.workflowStatus)).length;
    return {
      preArrival: count(['PRE_ARRIVAL', 'IN_TRANSIT', 'DISPATCHED']),
      arrived: count(['ARRIVED', 'TERMINAL_ARRIVED']),
      clearance: count(['UNDER_CLEARANCE', 'RECEIVED', 'DOCUMENTS_VERIFIED', 'PIECES_VERIFIED', 'WEIGHT_VERIFIED', 'DAMAGE_INSPECTED', 'CUSTOMS_SUBMITTED', 'CUSTOMS_ASSESSED', 'CUSTOMS_PAID', 'CUSTOMS_INSPECTION']),
      released: count(['RELEASED', 'CUSTOMS_CLEARED']),
      warehouse: count(['WAREHOUSE', 'WAREHOUSE_RECEIVING', 'MANIFEST_VERIFIED', 'MAWB_RECEIVED']),
      delivery: count(['DELIVERY']),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Operations"
        description="Handle import clearance, processing, and inbound logistics"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Import Operations' }]}
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
              <button onClick={() => setViewMode('pipeline')}
                className={`px-3 py-1.5 text-xs font-medium rounded-l-lg ${viewMode === 'pipeline' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>Pipeline</button>
              <button onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-r-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>List</button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-6">
        <StatCard label="Pre-Arrival" value={stageCounts.preArrival} icon={<Plane className="h-5 w-5" />} />
        <StatCard label="Arrived" value={stageCounts.arrived} icon={<Truck className="h-5 w-5" />} />
        <StatCard label="Under Clearance" value={stageCounts.clearance} icon={<FileCheck className="h-5 w-5" />} />
        <StatCard label="Released" value={stageCounts.released} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Warehouse" value={stageCounts.warehouse} icon={<Warehouse className="h-5 w-5" />} />
        <StatCard label="Delivery" value={stageCounts.delivery} icon={<Truck className="h-5 w-5" />} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setSelectedStatus(null); }}
            placeholder="Search by AWB, tracking, flight..." className="pl-9" />
        </div>
        <select value={selectedStatus || ''} onChange={e => setSelectedStatus(e.target.value || null)}
          className="flex h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="">All Statuses</option>
          {[
            { v: 'PRE_ARRIVAL', l: 'Pre-Arrival' },
            { v: 'ARRIVED', l: 'Arrived' },
            { v: 'UNDER_CLEARANCE', l: 'Under Clearance' },
            { v: 'RELEASED', l: 'Released' },
            { v: 'WAREHOUSE', l: 'Warehouse' },
            { v: 'DELIVERY', l: 'Delivery' },
            { v: 'EXCEPTION', l: 'Exception' },
          ].map(s => (
            <option key={s.v} value={s.v}>{s.l}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : viewMode === 'pipeline' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {pipelineData.map(col => {
            const Icon = col.icon;
            return (
              <div key={col.key} className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className={`flex items-center justify-between rounded-t-xl px-3 py-2 ${col.bg}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${col.color}`} />
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{col.label}</span>
                  </div>
                  <span className={`text-xs font-bold ${col.color}`}>{col.count}</span>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto p-2">
                  {col.items.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">No items</p>
                  ) : col.items.slice(0, 10).map(item => (
                    <div key={item.id}
                      className="cursor-pointer rounded-lg border border-gray-100 p-2 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                      onClick={() => router.push(`/workspace/import/${item.id}`)}>
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{item.awbNumber}</p>
                      <p className="text-[10px] text-gray-500">{item.awbPieces} pcs · {item.awbWeight}kg</p>
                      {(() => {
                        const next = NEXT_STEP[item.workflowStatus as string];
                        if (!next) return null;
                        return (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-6 w-full text-[10px]"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (next.action === 'GOTO_WAREHOUSE') router.push('/workspace/warehouse');
                              else handleAction(next.action, item.id);
                            }}
                          >
                            {next.label}
                          </Button>
                        );
                      })()}
                    </div>
                  ))}
                  {col.items.length > 10 && (
                    <p className="text-center text-[10px] text-gray-400">+{col.items.length - 10} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-12 w-12" />}
          title="No import shipments"
          description={search || selectedStatus ? 'No shipments match your filters.' : 'Import shipments will appear once flights arrive at destination stations.'}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((i) => (
              <div key={i.id}>
                <div
                  className="flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => router.push(`/workspace/import/${i.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{i.awbNumber}</p>
                      {i.workflowStatus === 'EXCEPTION' && (
                        <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {i.originStation?.code || '-'} → {i.destinationStation?.code || '-'}
                      <span> · {i.awbPieces} pcs · {i.awbWeight} kg</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-gray-400 hidden sm:inline">{new Date(i.createdAt).toLocaleDateString()}</span>
                    <StatusBadge status={statusVariant(i.workflowStatus)} label={i.workflowStatus.replace(/_/g, ' ')} />
                  </div>
                </div>
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-5 py-1.5 dark:border-gray-800 dark:bg-gray-800/30">
                  {getStatusActions(i)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {verifyEntity && (
        <Dialog open={!!verifyEntity} onOpenChange={(v) => { if (!v) closeVerify(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Verify Cargo</DialogTitle>
              <DialogDescription>
                {verifyEntity.awbNumber} — confirm documents, pieces, and weight in one step. Each check is recorded on the shipment timeline and audit log.
              </DialogDescription>
            </DialogHeader>

            {verifyError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{verifyError}</span>
              </div>
            )}

            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800/60">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Declared pieces</span>
                <span className="font-semibold text-gray-900 dark:text-white">{verifyEntity.awbPieces}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-gray-500">Declared weight</span>
                <span className="font-semibold text-gray-900 dark:text-white">{verifyEntity.awbWeight} kg</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {pendingVerificationSteps(verifyEntity.workflowStatus).map((step, idx) => (
                <div key={step.action} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    verifyRunning && verifyProgress === step.label
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                  }`}>
                    {idx + 1}
                  </span>
                  {step.label}
                  {verifyRunning && verifyProgress === step.label && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                </div>
              ))}
              {completeInspection && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 dark:bg-gray-800">
                    {pendingVerificationSteps(verifyEntity.workflowStatus).length + 1}
                  </span>
                  Inspection completed (ready for customs)
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Counted Pieces</label>
                <Input type="number" min="0" value={verifyPieces} onChange={e => setVerifyPieces(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Measured Weight (kg)</label>
                <Input type="number" min="0" step="0.01" value={verifyWeight} onChange={e => setVerifyWeight(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
              <textarea
                value={verifyNotes}
                onChange={e => setVerifyNotes(e.target.value)}
                rows={2}
                className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="Discrepancies, packaging condition, etc."
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={completeInspection} onChange={e => setCompleteInspection(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#d00020]" />
              Mark inspection complete (proceed to customs)
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={closeVerify} disabled={verifyRunning}>Cancel</Button>
              <Button size="sm" className="bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handleVerifySubmit} disabled={verifyRunning}>
                {verifyRunning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                {verifyRunning ? 'Verifying...' : 'Run Verification'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {reportEntity && (isMobile ? (
        <BottomSheet
          open={!!reportEntity}
          onClose={() => { setReportEntity(null); setReportDescription(''); setReportPieces(''); }}
          title={reportEntity.type === 'damage' ? 'Report Damage' : 'Report Missing Cargo'}
          description={reportEntity.type === 'damage' ? 'Record cargo damage details' : 'Report missing pieces'}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={reportDescription}
                onChange={e => setReportDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder={reportEntity.type === 'damage' ? 'Describe the damage...' : 'Describe what is missing...'}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Affected Pieces</label>
              <input type="number" value={reportPieces} onChange={e => setReportPieces(e.target.value)} min="1"
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="Number of pieces" />
            </div>
            <Button className="w-full bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handleReportSubmit} disabled={reportSaving}>
              {reportSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {reportSaving ? 'Submitting...' : `Submit ${reportEntity.type === 'damage' ? 'Damage Report' : 'Missing Report'}`}
            </Button>
          </div>
        </BottomSheet>
      ) : (
        <Dialog open={!!reportEntity} onOpenChange={(v) => { if (!v) { setReportEntity(null); setReportDescription(''); setReportPieces(''); } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{reportEntity.type === 'damage' ? 'Report Damage' : 'Report Missing Cargo'}</DialogTitle>
              <DialogDescription>
                {reportEntity.type === 'damage' ? 'Record cargo damage details and affected pieces.' : 'Report missing pieces and provide details.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea value={reportDescription} onChange={e => setReportDescription(e.target.value)} rows={3}
                  className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder={reportEntity.type === 'damage' ? 'Describe the damage...' : 'Describe what is missing...'} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Affected Pieces</label>
                <input type="number" value={reportPieces} onChange={e => setReportPieces(e.target.value)} min="1"
                  className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="Number of pieces" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setReportEntity(null); setReportDescription(''); setReportPieces(''); }}>Cancel</Button>
                <Button size="sm" className="bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handleReportSubmit} disabled={reportSaving}>
                  {reportSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  {reportSaving ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
