'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, RefreshCw, Package, FileText, Truck, Plane, Clock,
  CheckCircle, AlertTriangle, DollarSign, FileCheck, Warehouse,
  SearchX, XCircle, Loader2, Shield, Calendar, MapPin, User,
  Eye, Download, Upload, Send, Printer
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type TabId = 'overview' | 'cargo' | 'documents' | 'customs' | 'timeline' | 'consignee';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'cargo', label: 'Cargo', icon: Package },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'customs', label: 'Customs', icon: Shield },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'consignee', label: 'Consignee', icon: User },
];

const STATUS_ACTIONS: Record<string, { label: string; action: string; variant?: 'default' | 'outline' | 'destructive'; icon: any; confirmMessage?: string }[]> = {
  PRE_ARRIVAL: [
    { label: 'Confirm Arrival', action: 'CONFIRM_ARRIVAL', variant: 'default', icon: Truck },
    { label: 'Receive Manifest', action: 'RECEIVE_MANIFEST', variant: 'outline', icon: FileText },
  ],
  TERMINAL_ARRIVED: [
    { label: 'Verify Manifest', action: 'VERIFY_MANIFEST', variant: 'default', icon: FileCheck },
  ],
  MANIFEST_VERIFIED: [
    { label: 'Receive MAWB', action: 'RECEIVE_MAWB', variant: 'default', icon: FileText },
  ],
  MAWB_RECEIVED: [
    { label: 'Receive HAWBs', action: 'RECEIVE_HAWBS', variant: 'default', icon: Package },
  ],
  RECEIVED: [
    { label: 'Verify Documents', action: 'VERIFY_DOCUMENTS', variant: 'outline', icon: FileCheck },
    { label: 'Verify Pieces', action: 'VERIFY_PIECES', variant: 'outline', icon: Package },
    { label: 'Report Damage', action: 'REPORT_DAMAGE', variant: 'destructive', icon: AlertTriangle },
    { label: 'Report Missing', action: 'REPORT_MISSING', variant: 'destructive', icon: SearchX },
  ],
  DOCUMENTS_VERIFIED: [
    { label: 'Verify Pieces', action: 'VERIFY_PIECES', variant: 'default', icon: Package },
    { label: 'Report Damage', action: 'REPORT_DAMAGE', variant: 'destructive', icon: AlertTriangle },
    { label: 'Report Missing', action: 'REPORT_MISSING', variant: 'destructive', icon: SearchX },
  ],
  PIECES_VERIFIED: [
    { label: 'Verify Weight', action: 'VERIFY_WEIGHT', variant: 'default', icon: Clock },
    { label: 'Verify Documents', action: 'VERIFY_DOCUMENTS', variant: 'outline', icon: FileCheck },
    { label: 'Report Damage', action: 'REPORT_DAMAGE', variant: 'destructive', icon: AlertTriangle },
  ],
  WEIGHT_VERIFIED: [
    { label: 'Complete Inspection', action: 'COMPLETE_INSPECTION', variant: 'default', icon: CheckCircle },
    { label: 'Submit Customs', action: 'SUBMIT_CUSTOMS', variant: 'outline', icon: FileText },
  ],
  DAMAGE_INSPECTED: [
    { label: 'Submit Customs', action: 'SUBMIT_CUSTOMS', variant: 'default', icon: FileText },
  ],
  CUSTOMS_SUBMITTED: [
    { label: 'Record Assessment', action: 'RECORD_ASSESSMENT', variant: 'default', icon: DollarSign },
  ],
  CUSTOMS_ASSESSED: [
    { label: 'Record Payment', action: 'RECORD_DUTY_PAYMENT', variant: 'default', icon: DollarSign, confirmMessage: 'Confirm duty/tax payment?' },
  ],
  CUSTOMS_PAID: [
    { label: 'Schedule Inspection', action: 'SCHEDULE_INSPECTION', variant: 'outline', icon: Calendar },
  ],
  CUSTOMS_INSPECTION: [
    { label: 'Release', action: 'CUSTOMS_RELEASED', variant: 'default', icon: CheckCircle },
    { label: 'Report Hold', action: 'REPORT_HOLD', variant: 'destructive', icon: XCircle },
  ],
  CUSTOMS_HOLD: [
    { label: 'Resolve Hold', action: 'RESOLVE_HOLD', variant: 'default', icon: CheckCircle, confirmMessage: 'Confirm hold resolved?' },
  ],
  CUSTOMS_CLEARED: [
    { label: 'Receive Into Warehouse', action: 'RECEIVE_INTO_WAREHOUSE', variant: 'default', icon: Warehouse, confirmMessage: 'Release to warehouse?' },
  ],
  WAREHOUSE_RECEIVING: [],
  EXCEPTION: [
    { label: 'Resolve Exception', action: 'RESOLVE_EXCEPTION', variant: 'default', icon: CheckCircle, confirmMessage: 'Resolve exception?' },
  ],
};

const statusVariant = (s: string) => {
  if (['CUSTOMS_CLEARED', 'WAREHOUSE_RECEIVING'].includes(s)) return 'success' as const;
  if (['TERMINAL_ARRIVED'].includes(s)) return 'info' as const;
  if (['PRE_ARRIVAL', 'MANIFEST_VERIFIED', 'MAWB_RECEIVED'].includes(s)) return 'pending' as const;
  if (['RECEIVED', 'DOCUMENTS_VERIFIED', 'PIECES_VERIFIED', 'WEIGHT_VERIFIED', 'DAMAGE_INSPECTED', 'CUSTOMS_SUBMITTED', 'CUSTOMS_ASSESSED', 'CUSTOMS_PAID', 'CUSTOMS_INSPECTION'].includes(s)) return 'warning' as const;
  if (['EXCEPTION', 'CUSTOMS_HOLD'].includes(s)) return 'error' as const;
  return 'pending' as const;
};

export default function ImportOperationsCenter() {
  const router = useRouter();
  const params = useParams();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: string; message: string } | null>(null);

  const fetchShipment = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/master-awbs/${params.id}`);
      if (res.ok) { const j = await res.json(); setData(j.data); }
    } catch {} finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { fetchShipment(); }, [fetchShipment]);

  const handleAction = async (action: string) => {
    if (!params.id || actionLoading) return;
    setActionLoading(action);
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'MasterAWB', entityId: params.id, action }),
      });
      if (res.ok) fetchShipment();
      else { const err = await res.json(); alert(err.error || 'Action failed'); }
    } catch { alert('Network error'); }
    finally { setActionLoading(null); setConfirmAction(null); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="mb-3 h-12 w-12 text-gray-400" />
        <p className="text-sm text-gray-500">Shipment not found</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/workspace/import')}>Back to Import</Button>
      </div>
    );
  }

  const status = data.workflowStatus || '';
  const actions = STATUS_ACTIONS[status] || [];

  const renderQuickActions = () => actions.length > 0 && (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-5 py-2 dark:border-gray-800 dark:bg-gray-800/30">
      <span className="text-xs font-medium text-gray-500">Quick Actions:</span>
      {actions.map(a => (
        <Button key={a.action} size="sm" variant={a.variant || 'default'} className="h-7 text-xs"
          onClick={() => {
            if (a.confirmMessage) setConfirmAction({ action: a.action, message: a.confirmMessage });
            else handleAction(a.action);
          }}
          disabled={actionLoading === a.action}>
          {actionLoading === a.action ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <a.icon className="mr-1 h-3 w-3" />}
          {a.label}
        </Button>
      ))}
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Shipment Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">MAWB</span><span className="font-medium text-gray-900 dark:text-white">{data.awbNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tracking</span><span className="text-gray-900 dark:text-white">{data.trackingNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pieces</span><span className="text-gray-900 dark:text-white">{data.awbPieces}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Weight</span><span className="text-gray-900 dark:text-white">{data.awbWeight} kg</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="text-gray-900 dark:text-white">{data.shipmentType || 'General'}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Route</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Origin</span><span className="text-gray-900 dark:text-white">{data.originStation?.name || data.originStation?.code || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Destination</span><span className="text-gray-900 dark:text-white">{data.destinationStation?.name || data.destinationStation?.code || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Flight</span><span className="text-gray-900 dark:text-white">{data.flightNumber || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">ETD</span><span className="text-gray-900 dark:text-white">{data.etd ? new Date(data.etd).toLocaleString() : '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">ETA</span><span className="text-gray-900 dark:text-white">{data.eta ? new Date(data.eta).toLocaleString() : '-'}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Parties</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-xs text-gray-500">Shipper</span>
              <p className="text-gray-900 dark:text-white">{data.senderName || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Consignee</span>
              <p className="text-gray-900 dark:text-white">{data.receiverName || '-'}</p>
            </div>
            {data.consigneeAddress && <div><span className="text-xs text-gray-500">Address</span><p className="text-gray-900 dark:text-white">{data.consigneeAddress}</p></div>}
          </div>
        </div>
      </div>

      {data.houseAwbs && data.houseAwbs.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">House AWBs ({data.houseAwbs.length})</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.houseAwbs.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{h.houseAWBNumber}</p>
                  <p className="text-xs text-gray-500">{h.pieces} pcs · {h.weight} kg</p>
                </div>
                <StatusBadge status={statusVariant(h.workflowStatus || status)} label={(h.workflowStatus || status).replace(/_/g, ' ')} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCargoTab = () => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs text-gray-500">Total Pieces</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.awbPieces || 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs text-gray-500">Total Weight</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.awbWeight || 0} kg</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs text-gray-500">Location</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.cargoLocation || 'Not assigned'}</p>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <Package className="mx-auto mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-500">Piece-level scanning will appear here.</p>
        <p className="text-xs text-gray-400 mt-1">Scanned: 0 / {data.awbPieces || 0} pieces</p>
      </div>
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Document Checklist</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {[
            { type: 'HAWB', required: true },
            { type: 'Commercial Invoice', required: true },
            { type: 'Packing List', required: true },
            { type: 'Certificate of Origin', required: false },
            { type: 'Import Permit', required: false },
            { type: 'Dangerous Goods Declaration', required: false },
          ].map(doc => (
            <div key={doc.type} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{doc.type}</p>
                  <p className="text-xs text-gray-500">{doc.required ? 'Required' : 'Optional'}</p>
                </div>
              </div>
              <StatusBadge status="pending" label="Pending" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCustomsTab = () => {
    const isHold = status === 'CUSTOMS_HOLD';
    const isCleared = status === 'CUSTOMS_CLEARED';
    const isSubmitted = status === 'CUSTOMS_SUBMITTED' || status === 'CUSTOMS_ASSESSED' || status === 'CUSTOMS_PAID' || status === 'CUSTOMS_INSPECTION';

    const customsSteps = [
      { key: 'NOT_SUBMITTED', label: 'Not Submitted' },
      { key: 'SUBMITTED', label: 'Submitted' },
      { key: 'ASSESSED', label: 'Assessed' },
      { key: 'PAID', label: 'Paid' },
      { key: 'INSPECTION', label: 'Inspection' },
      { key: 'CLEARED', label: 'Cleared' },
    ];

    const customsStepMap: Record<string, number> = {
      'DAMAGE_INSPECTED': 0, 'CUSTOMS_SUBMITTED': 1, 'CUSTOMS_ASSESSED': 2,
      'CUSTOMS_PAID': 3, 'CUSTOMS_INSPECTION': 4, 'CUSTOMS_CLEARED': 5, 'CUSTOMS_HOLD': 4,
    };
    const currentStep = customsStepMap[status] ?? -1;

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Customs Clearance</h3>
            {isHold && <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="h-3 w-3" /> ON HOLD</span>}
            {isCleared && <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle className="h-3 w-3" /> CLEARED</span>}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {customsSteps.map((step, i) => {
              const isActive = i === currentStep;
              const isComplete = i < currentStep;
              return (
                <div key={step.key} className="flex items-center gap-1 shrink-0">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isComplete ? 'bg-green-600' : isActive ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    {isComplete ? <CheckCircle className="h-3 w-3 text-white" /> : <span className="text-[10px] font-medium text-white">{i + 1}</span>}
                  </div>
                  <span className={`text-[10px] ${isComplete ? 'text-green-600' : isActive ? 'text-purple-600 font-medium' : 'text-gray-400'}`}>{step.label}</span>
                  {i < customsSteps.length - 1 && <div className={`h-0.5 w-3 ${isComplete ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {isSubmitted && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">Customs process in progress. Current status: {status.replace(/_/g, ' ')}</p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <Shield className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-500">Detailed customs declaration and duty/tax tracking will appear here.</p>
        </div>
      </div>
    );
  };

  const renderTimelineTab = () => (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Shipment Timeline</h3>
      </div>
      <div className="p-4">
        {data.shipmentTimeline && data.shipmentTimeline.length > 0 ? (
          <div className="space-y-4">
            {data.shipmentTimeline.map((t: any, i: number) => (
              <div key={t.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${i === 0 ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Clock className="h-3 w-3 text-gray-500" />
                  </div>
                  {i < data.shipmentTimeline.length - 1 && <div className="h-full w-0.5 bg-gray-200 dark:bg-gray-700" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.title || t.action?.replace(/_/g, ' ') || t.eventType}</p>
                  {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                  {t.notes && <p className="text-xs text-gray-400 italic">{t.notes}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">No timeline events yet</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderConsigneeTab = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Consignee Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="text-gray-900 dark:text-white">{data.receiverName || 'Not set'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="text-gray-900 dark:text-white">{data.receiverPhone || '-'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-gray-900 dark:text-white">{data.receiverEmail || '-'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="text-gray-900 dark:text-white">{data.consigneeAddress || '-'}</span></div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm"><Send className="mr-1 h-3 w-3" /> Send Arrival Notice</Button>
        <Button variant="outline" size="sm"><Send className="mr-1 h-3 w-3" /> Send Clearance Notice</Button>
      </div>
    </div>
  );

  const tabContent: Record<TabId, () => React.ReactNode> = {
    overview: renderOverviewTab,
    cargo: renderCargoTab,
    documents: renderDocumentsTab,
    customs: renderCustomsTab,
    timeline: renderTimelineTab,
    consignee: renderConsigneeTab,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Import — ${data.awbNumber}`}
        description={`${data.trackingNumber || ''} · ${data.awbPieces} pcs · ${data.awbWeight} kg`}
        breadcrumbs={[
          { label: 'Workspace', href: '/workspace' },
          { label: 'Import', href: '/workspace/import' },
          { label: data.awbNumber },
        ]}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={statusVariant(status)} label={status.replace(/_/g, ' ')} />
            <Button variant="outline" size="sm" onClick={fetchShipment}><RefreshCw className="mr-1 h-3 w-3" /> Refresh</Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/workspace/import')}><ArrowLeft className="mr-1 h-3 w-3" /> Back</Button>
          </div>
        }
      />

      {renderQuickActions()}

      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors shrink-0 ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[300px]">
        {tabContent[activeTab]()}
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>{confirmAction?.message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button size="sm" className="bg-[#d00020] text-white hover:bg-[#d00020]/90"
              onClick={() => confirmAction && handleAction(confirmAction.action)}
              disabled={actionLoading === confirmAction?.action}>
              {actionLoading === confirmAction?.action ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
