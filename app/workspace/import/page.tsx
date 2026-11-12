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
  { key: 'preArrival', label: 'Pre-Arrival', statuses: ['PRE_ARRIVAL'], icon: Plane, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'arriving', label: 'Arriving', statuses: ['IN_TRANSIT', 'TERMINAL_ARRIVED', 'MANIFEST_VERIFIED', 'MAWB_RECEIVED'], icon: Truck, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { key: 'inspection', label: 'In Inspection', statuses: ['RECEIVED', 'DOCUMENTS_VERIFIED', 'PIECES_VERIFIED', 'WEIGHT_VERIFIED', 'DAMAGE_INSPECTED'], icon: FileCheck, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { key: 'customs', label: 'Customs', statuses: ['CUSTOMS_SUBMITTED', 'CUSTOMS_ASSESSED', 'CUSTOMS_PAID', 'CUSTOMS_INSPECTION', 'CUSTOMS_HOLD'], icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { key: 'warehouse', label: 'Ready for Warehouse', statuses: ['CUSTOMS_CLEARED', 'WAREHOUSE_RECEIVING'], icon: Warehouse, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'exception', label: 'Exceptions', statuses: ['EXCEPTION'], icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
];

const statusVariant = (s: string) => {
  switch (s) {
    case 'RELEASED': case 'DELIVERED': case 'COMPLETED': case 'CUSTOMS_CLEARED': return 'success' as const;
    case 'TERMINAL_ARRIVED': case 'RECEIVED': case 'IN_TRANSIT': return 'info' as const;
    case 'PRE_ARRIVAL': case 'MANIFEST_VERIFIED': case 'MAWB_RECEIVED': return 'pending' as const;
    case 'DOCUMENTS_VERIFIED': case 'PIECES_VERIFIED': case 'WEIGHT_VERIFIED': case 'DAMAGE_INSPECTED': return 'warning' as const;
    case 'CUSTOMS_SUBMITTED': case 'CUSTOMS_ASSESSED': case 'CUSTOMS_PAID': case 'CUSTOMS_INSPECTION': return 'warning' as const;
    case 'EXCEPTION': case 'CUSTOMS_HOLD': return 'error' as const;
    default: return 'pending' as const;
  }
};

export default function ImportPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [data, setData] = useState<ImportItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    preArrival: 0, terminalArrived: 0, pendingInspection: 0,
    customsPending: 0, readyForWarehouse: 0, exceptionCount: 0,
    customsHold: 0, totalImport: 0, releasedToday: 0,
    manifestedCount: 0, avgProcessingTime: 0, receivedMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [reportEntity, setReportEntity] = useState<{ id: string; type: 'damage' | 'missing' } | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [reportPieces, setReportPieces] = useState('');
  const [reportSaving, setReportSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100', scope: 'import' });
      if (selectedStatus) params.set('status', selectedStatus);
      if (search) params.set('search', search);
      const [dataRes, statsRes] = await Promise.all([
        fetch(`/api/master-awbs?${params}`),
        fetch('/api/dashboard/import'),
      ]);
      if (dataRes.ok) { const j = await dataRes.json(); setData(j.data || []); }
      if (statsRes.ok) { const j = await statsRes.json(); if (j.success) setStats(j.data); }
    } catch {} finally {
      setLoading(false);
    }
  }, [search, selectedStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useWorkflowQueueSubscription('import', fetchData);

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
          notes: reportDescription,
          pieces: reportPieces ? parseInt(reportPieces) : undefined,
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

  const getStatusActions = (item: ImportItem) => {
    const s = item.workflowStatus;
    if (s === 'PRE_ARRIVAL') return (
      <div className="flex gap-1">
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction('CONFIRM_ARRIVAL', item.id)}>
          <Truck className="mr-1 h-3 w-3" /> Confirm Arrival
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => router.push(`/workspace/import/${item.id}`)}>
          View
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
        {(s === 'RECEIVED' || s === 'PIECES_VERIFIED') && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction('VERIFY_DOCUMENTS', item.id)}>
            <FileCheck className="mr-1 h-3 w-3" /> Docs
          </Button>
        )}
        {(s === 'RECEIVED' || s === 'DOCUMENTS_VERIFIED') && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction('VERIFY_PIECES', item.id)}>
            <Package className="mr-1 h-3 w-3" /> Pieces
          </Button>
        )}
        {(s === 'PIECES_VERIFIED' || s === 'DOCUMENTS_VERIFIED') && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction('VERIFY_WEIGHT', item.id)}>
            <Clock className="mr-1 h-3 w-3" /> Weight
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
    return PIPELINE_COLUMNS.map(col => ({
      ...col,
      items: data.filter(d => col.statuses.includes(d.workflowStatus)),
      count: col.statuses.reduce((sum, s) => {
        if (s === 'PRE_ARRIVAL') return sum + stats.preArrival;
        if (s === 'TERMINAL_ARRIVED' || s === 'MANIFEST_VERIFIED' || s === 'MAWB_RECEIVED') return sum + (s === 'TERMINAL_ARRIVED' ? stats.terminalArrived : s === 'MANIFEST_VERIFIED' ? stats.manifestedCount : 0);
        if (s === 'RECEIVED' || s === 'DOCUMENTS_VERIFIED' || s === 'PIECES_VERIFIED' || s === 'WEIGHT_VERIFIED' || s === 'DAMAGE_INSPECTED') return sum + (s === 'RECEIVED' ? 0 : 0);
        if (s === 'CUSTOMS_HOLD') return sum + stats.customsHold;
        if (s === 'EXCEPTION') return sum + stats.exceptionCount;
        return sum;
      }, 0) || 0,
    }));
  }, [data, stats]);

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
        <StatCard label="Pre-Arrival" value={stats.preArrival} icon={<Plane className="h-5 w-5" />} />
        <StatCard label="Arriving" value={stats.terminalArrived} icon={<Truck className="h-5 w-5" />} />
        <StatCard label="In Inspection" value={stats.pendingInspection} icon={<FileCheck className="h-5 w-5" />} />
        <StatCard label="Customs" value={stats.customsPending} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Exceptions" value={stats.exceptionCount} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Avg Time" value={`${stats.avgProcessingTime}h`} icon={<Clock className="h-5 w-5" />} />
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
          {PIPELINE_COLUMNS.flatMap(col => col.statuses).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
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
