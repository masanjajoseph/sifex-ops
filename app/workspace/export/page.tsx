'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plane, RefreshCw, Plus, Package, Weight, MapPin,
  FileText, Link, Send, Clock, AlertCircle, CheckCircle, Printer
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterBar } from '@/components/ui/FilterBar';

interface MasterAWB {
  id: string;
  awbNumber: string;
  trackingNumber: string;
  senderName: string;
  receiverName: string;
  awbPieces: number;
  awbWeight: number;
  cargoStatus: string;
  workflowStatus: string;
  shipmentType: string;
  originStation: { code: string } | null;
  destinationStation: { code: string } | null;
  createdAt: string;
}

interface DashboardStats {
  acceptedCount: number;
  assignedCount: number;
  manifestedCount: number;
  loadedCount: number;
  departedCount: number;
  inTransitCount: number;
  flightsToday: number;
}

const WORKFLOW_STEPS = [
  { key: 'ACCEPTED', label: 'Accepted', icon: CheckCircle },
  { key: 'ASSIGNED', label: 'HAWBs Assigned', icon: Link },
  { key: 'MANIFESTED', label: 'Manifested', icon: FileText },
  { key: 'LOADED', label: 'Loaded', icon: Package },
  { key: 'DEPARTED', label: 'Departed', icon: Plane },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: Send },
];

const statusVariant = (s: string) => {
  switch (s) {
    case 'DELIVERED': case 'POD_SIGNED': case 'RELEASED': return 'success' as const;
    case 'IN_TRANSIT': case 'MANIFESTED': case 'LOADED': case 'DEPARTED': return 'info' as const;
    case 'ACCEPTED': case 'RCS': case 'INITIATED': case 'VALIDATED': case 'DRAFT': return 'pending' as const;
    case 'CUSTOMS_HOLD': case 'CUSTOMS_QUERY': case 'UNDER_CLEARANCE': return 'warning' as const;
    case 'CANCELLED': case 'OFFLOADED': return 'error' as const;
    default: return 'pending' as const;
  }
};

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'ASSIGNED', label: 'HAWBs Assigned' },
  { value: 'MANIFESTED', label: 'Manifested' },
  { value: 'LOADED', label: 'Loaded' },
  { value: 'DEPARTED', label: 'Departed' },
];

function QuickActionBar({ workflowStatus, cargoStatus, manifestNumber, onAction, actionError }: { workflowStatus: string; cargoStatus?: string | null; manifestNumber?: string | null; onAction: (action: string) => void; actionError?: string | null }) {
  const actions: Record<string, { label: string; icon: any; variant: 'default' | 'outline' | 'destructive'; action: string }[]> = {
    ACCEPTED: [
      { label: 'Assign HAWBs', icon: Link, variant: 'default', action: 'ASSIGN_HAWB' },
      { label: 'View Cargo', icon: Package, variant: 'outline', action: 'VIEW_CARGO' },
    ],
    ASSIGNED: [
      { label: 'Generate Manifest', icon: FileText, variant: 'default', action: 'GENERATE_MANIFEST' },
      { label: 'Complete Loading', icon: Package, variant: 'outline', action: 'COMPLETE_LOADING' },
    ],
    MANIFESTED: [
      { label: 'Complete Loading', icon: Package, variant: 'default', action: 'COMPLETE_LOADING' },
      { label: 'Depart Flight', icon: Plane, variant: 'default', action: 'DEPART_FLIGHT' },
      { label: 'Print Manifest', icon: Printer, variant: 'outline', action: 'PRINT_MANIFEST' },
    ],
    DEPARTED: [
      { label: 'Mark In Transit', icon: Send, variant: 'default', action: 'MARK_IN_TRANSIT' },
      { label: 'View Timeline', icon: Clock, variant: 'outline', action: 'VIEW_TIMELINE' },
    ],
    DRAFT: [
      { label: 'Edit Shipment', icon: FileText, variant: 'outline', action: 'EDIT_SHIPMENT' },
      { label: 'Validate', icon: CheckCircle, variant: 'default', action: 'VALIDATE_SHIPMENT' },
    ],
    VALIDATED: [
      { label: 'Generate HAWB', icon: FileText, variant: 'default', action: 'GENERATE_HAWB' },
      { label: 'View Cargo', icon: Package, variant: 'outline', action: 'VIEW_CARGO' },
    ],
    HAWB_GENERATED: [
      { label: 'Start Loading', icon: Package, variant: 'default', action: 'START_LOADING' },
      { label: 'Assign HAWBs', icon: Link, variant: 'outline', action: 'ASSIGN_MAWB' },
      { label: 'Print Label', icon: Package, variant: 'outline', action: 'PRINT_LABEL' },
    ],
    LOADING: [
      { label: 'Loading View', icon: Package, variant: 'default', action: 'LOADING_VIEW' },
      { label: 'Complete Loading', icon: CheckCircle, variant: 'default', action: 'COMPLETE_LOADING' },
    ],
    LOADED: [
      { label: 'Generate Manifest', icon: FileText, variant: 'default', action: 'GENERATE_MANIFEST' },
      { label: 'Depart Flight', icon: Plane, variant: 'default', action: 'DEPART_FLIGHT' },
    ],
    MAWB_ASSIGNED: [
      { label: 'Generate Manifest', icon: FileText, variant: 'default', action: 'GENERATE_MANIFEST' },
      { label: 'View Manifest', icon: FileText, variant: 'outline', action: 'VIEW_MANIFEST' },
      { label: 'Print Manifest', icon: Package, variant: 'outline', action: 'PRINT_MANIFEST' },
      { label: 'Verify Cargo', icon: Package, variant: 'outline', action: 'VERIFY_CARGO' },
    ],
    MANIFEST_CREATED: [
      { label: 'View Manifest', icon: FileText, variant: 'outline', action: 'VIEW_MANIFEST' },
      { label: 'Print Manifest', icon: Printer, variant: 'outline', action: 'PRINT_MANIFEST' },
      { label: 'Assign Flight', icon: Plane, variant: 'default', action: 'ASSIGN_FLIGHT' },
      { label: 'View Flight', icon: MapPin, variant: 'outline', action: 'VIEW_FLIGHT' },
    ],
    FLIGHT_ASSIGNED: [
      { label: 'Dispatch Flight', icon: Send, variant: 'default', action: 'DISPATCH_FLIGHT' },
      { label: 'View Manifest', icon: FileText, variant: 'outline', action: 'VIEW_MANIFEST' },
    ],
    DISPATCHED: [
      { label: 'Track Flight', icon: MapPin, variant: 'outline', action: 'TRACK_FLIGHT' },
      { label: 'View Timeline', icon: Clock, variant: 'outline', action: 'VIEW_TIMELINE' },
    ],
    IN_TRANSIT: [
      { label: 'Track Flight', icon: MapPin, variant: 'outline', action: 'TRACK_FLIGHT' },
      { label: 'View Timeline', icon: Clock, variant: 'outline', action: 'VIEW_TIMELINE' },
    ],
  };

  const currentActions = (actions[workflowStatus] || []).filter(a => {
    // Never offer a step that is already done: cargo/loading and manifesting can
    // happen in either order, so gate the actions on the actual cargo state.
    if (a.action === 'COMPLETE_LOADING' && cargoStatus === 'LOADED') return false;
    if (a.action === 'GENERATE_MANIFEST' && manifestNumber) return false;
    return true;
  });

  if (currentActions.length === 0 && !actionError) return null;

  return (
    <div className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
      {currentActions.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2">
          <span className="mr-1 text-xs font-medium text-gray-500">Quick Actions:</span>
          {currentActions.map((a) => (
            <Button
              key={a.action}
              size="sm"
              variant={a.variant}
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onAction(a.action); }}
            >
              <a.icon className="mr-1 h-3 w-3" />
              {a.label}
            </Button>
          ))}
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 px-5 pb-2">
          <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
          <span className="text-xs text-red-600 dark:text-red-400">{actionError}</span>
        </div>
      )}
    </div>
  );
}

export default function ExportPage() {
  const router = useRouter();
  const [exports, setExports] = useState<MasterAWB[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    acceptedCount: 0, assignedCount: 0, manifestedCount: 0,
    loadedCount: 0, departedCount: 0, inTransitCount: 0, flightsToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const [assignMawbId, setAssignMawbId] = useState<string | null>(null);
  const [assignMawbNumber, setAssignMawbNumber] = useState('');
  const [availableHawbs, setAvailableHawbs] = useState<{ id: string; houseAWBNumber: string; trackingNumber: string; pieces: number; weight: number; description?: string | null }[]>([]);
  const [assignSelected, setAssignSelected] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', scope: 'export' });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const [exportsRes, statsRes] = await Promise.all([
        fetch(`/api/master-awbs?${params}`),
        fetch('/api/dashboard/export'),
      ]);
      if (exportsRes.ok) { const j = await exportsRes.json(); setExports(j.data || []); setTotalPages(j.meta?.totalPages || 1); setTotal(j.meta?.total || 0); }
      if (statsRes.ok) { const j = await statsRes.json(); if (j.success) setStats(j.data); }
    } catch {
      setExports([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAssign = async (mawbId: string, mawbNumber: string) => {
    setAssignMawbId(mawbId);
    setAssignMawbNumber(mawbNumber);
    setAssignSelected([]);
    setAssignError('');
    setAssignLoading(true);
    try {
      const res = await fetch('/api/house-awbs?unassigned=true&scope=export&limit=100', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load House AWBs');
      const json = await res.json();
      setAvailableHawbs(json.data || []);
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : 'Failed to load House AWBs');
    } finally {
      setAssignLoading(false);
    }
  };

  const submitAssign = async () => {
    if (!assignMawbId || assignSelected.length === 0) return;
    setAssignSaving(true);
    setAssignError('');
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'MasterAWB',
          entityId: assignMawbId,
          action: 'ASSIGN_HAWB',
          metadata: { hawbIds: assignSelected },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to assign House AWBs');
      }
      setAssignMawbId(null);
      fetchData();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : 'Failed to assign House AWBs');
    } finally {
      setAssignSaving(false);
    }
  };

  const handleQuickAction = async (action: string, mawbId: string, currentStatus: string) => {
    setActionErrors(prev => ({ ...prev, [mawbId]: '' }));
    if (action === 'ASSIGN_HAWB') {
      const mawb = exports.find(e => e.id === mawbId);
      openAssign(mawbId, mawb?.awbNumber || '');
      return;
    }
    const navActions: Record<string, () => void> = {
      EDIT_SHIPMENT: () => router.push(`/workspace/master-awb/${mawbId}?edit=true`),
      VIEW_CARGO: () => router.push(`/workspace/master-awb/${mawbId}`),
      VIEW_MANIFEST: () => router.push(`/workspace/manifests?mawb=${mawbId}`),
      PRINT_HAWB: () => window.open(`/workspace/house-awb/${mawbId}/print`, '_blank'),
      PRINT_LABEL: () => window.open(`/workspace/master-awb/${mawbId}/label`, '_blank'),
      PRINT_MANIFEST: () => window.open(`/workspace/manifests/${mawbId}/print`, '_blank'),
      VIEW_FLIGHT: () => router.push(`/workspace/flights`),
      TRACK_FLIGHT: () => router.push(`/workspace/tracking?awb=${mawbId}`),
      VIEW_TIMELINE: () => router.push(`/workspace/master-awb/${mawbId}?tab=timeline`),
      LOADING_VIEW: () => router.push(`/workspace/master-awb/${mawbId}?tab=loading`),
    };
    if (navActions[action]) { navActions[action](); return; }
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'MasterAWB', entityId: mawbId, action }),
      });
      if (res.ok) {
        fetchData();
        router.refresh();
      } else {
        const err = await res.json();
        setActionErrors(prev => ({ ...prev, [mawbId]: err.error || 'Action failed' }));
      }
    } catch (e) { setActionErrors(prev => ({ ...prev, [mawbId]: 'Network error' })); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Operations"
        description="Manage export shipments and air waybill documentation"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Export Operations' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/workspace/export/new?mode=hawb')}>
              <Plus className="mr-1 h-4 w-4" /> New HAWB
            </Button>
            <Button size="sm" onClick={() => router.push('/workspace/export/new')}>
              <Plus className="mr-1 h-4 w-4" /> New MAWB
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-5">
        <StatCard label="Accepted" value={stats.acceptedCount} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="HAWBs Assigned" value={stats.assignedCount} icon={<Link className="h-5 w-5" />} />
        <StatCard label="Manifested" value={stats.manifestedCount} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Loaded" value={stats.loadedCount} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Flights Today" value={stats.flightsToday} icon={<Plane className="h-5 w-5" />} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <SearchInput
            placeholder="Search by AWB, tracking, sender, receiver..."
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            className="max-w-md"
          />
          <FilterBar
            filters={[{
              id: 'status', label: 'Status', options: statusOptions, value: statusFilter,
              onChange: (v) => { setStatusFilter(v); setPage(1); },
            }]}
            onClearAll={() => { setStatusFilter('all'); setSearch(''); setPage(1); }}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{total} total shipments</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : exports.length === 0 ? (
        <EmptyState
          icon={<Plane className="h-12 w-12" />}
          title="No export shipments"
          description={search || statusFilter !== 'all' ? 'No shipments match your filters.' : 'Accept cargo to create export shipments.'}
          action={!search && statusFilter === 'all' ? (
            <Button onClick={() => router.push('/workspace/export/new')}>
              <Plus className="mr-1 h-4 w-4" /> Create First Export
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {exports.map((e) => {
              const stepIx = WORKFLOW_STEPS.findIndex(s => s.key === e.workflowStatus);
              const isDispatched = e.workflowStatus === 'DISPATCHED';
              return (
                <div key={e.id}>
                  <div
                    className="flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    onClick={() => router.push(`/workspace/master-awb/${e.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{e.awbNumber}</p>
                        <span className="text-xs text-gray-400">#{e.trackingNumber}</span>
                        {stepIx >= 0 && (
                          <div className="flex items-center gap-1">
                            {WORKFLOW_STEPS.map((s, i) => {
                              const isComplete = i < stepIx;
                              const isCurrent = i === stepIx;
                              const Icon = s.icon;
                              return (
                                <div key={s.key} className="flex items-center">
                                  <div className={`flex h-5 w-5 items-center justify-center rounded-full ${isComplete ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : isCurrent ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                                    <Icon className="h-2.5 w-2.5" />
                                  </div>
                                  {i < WORKFLOW_STEPS.length - 1 && (
                                    <div className={`mx-0.5 h-0.5 w-2 ${isComplete ? 'bg-green-400' : isCurrent && i === stepIx ? 'bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {e.senderName} → {e.receiverName}
                        {e.originStation && e.destinationStation && (
                          <span> · {e.originStation.code} → {e.destinationStation.code}</span>
                        )}
                        <span> · {e.awbPieces} pcs · {e.awbWeight} kg</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </span>
                      <StatusBadge status={isDispatched ? 'info' : statusVariant(e.workflowStatus || e.cargoStatus)} label={(e.workflowStatus || e.cargoStatus).replace(/_/g, ' ')} />
                    </div>
                  </div>
                  <QuickActionBar workflowStatus={e.workflowStatus} cargoStatus={(e as any).cargoStatus} manifestNumber={(e as any).manifestNumber} onAction={(action) => handleQuickAction(action, e.id, e.workflowStatus)} actionError={actionErrors[e.id]} />
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {assignMawbId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Assign House AWBs</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">MAWB {assignMawbNumber}</p>
              </div>
              <button onClick={() => setAssignMawbId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                Close
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto px-5 py-4">
              {assignLoading ? (
                <p className="py-6 text-center text-sm text-gray-500">Loading House AWBs…</p>
              ) : availableHawbs.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No unassigned House AWBs. Create HAWBs first.
                </p>
              ) : (
                <>
                  <label className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={assignSelected.length === availableHawbs.length}
                      onChange={e => setAssignSelected(e.target.checked ? availableHawbs.map(h => h.id) : [])}
                    />
                    Select all ({availableHawbs.length})
                  </label>
                  <div className="space-y-2">
                    {availableHawbs.map(h => (
                      <label key={h.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                        <input
                          type="checkbox"
                          checked={assignSelected.includes(h.id)}
                          onChange={e => setAssignSelected(prev =>
                            e.target.checked ? [...prev, h.id] : prev.filter(id => id !== h.id)
                          )}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{h.houseAWBNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {h.trackingNumber} · {h.pieces} pcs · {h.weight} kg
                            {h.description ? ` · ${h.description}` : ''}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {assignError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{assignError}</p>}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">{assignSelected.length} selected</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAssignMawbId(null)}>Cancel</Button>
                <Button size="sm" onClick={submitAssign} disabled={assignSaving || assignSelected.length === 0}>
                  {assignSaving ? 'Assigning…' : 'Assign HAWBs'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
