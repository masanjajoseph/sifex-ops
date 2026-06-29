'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Plane, Package, Weight, MapPin, Calendar,
  User, Building2, Hash, ExternalLink, RefreshCw, AlertCircle,
  Clock, CheckCircle2, XCircle, Loader2, Plus, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

interface ShipmentDetail {
  id: string;
  awbNumber: string;
  trackingNumber: string;
  senderName: string;
  senderAddress: string;
  senderCompany?: string;
  senderPhone?: string;
  receiverName: string;
  receiverAddress: string;
  receiverCompany?: string;
  receiverPhone?: string;
  awbPieces: number;
  awbWeight: number;
  volume: number;
  chargeableWeight: number;
  cargoStatus: string;
  warehouseStatus: string;
  billingStatus: string;
  shipmentType: string;
  paymentMode: string;
  currency: string;
  customsValue: number;
  description?: string;
  flightNumber: string;
  originStation?: { code: string; name: string };
  destinationStation?: { code: string; name: string };
  houseAWBs: Array<{
    id: string;
    houseAWBNumber: string;
    pieces: number;
    weight: number;
    cargoStatus: string;
    billingStatus: string;
    shipmentType: string;
    parcels: Array<{ id: string; barcode: string }>;
  }>;
  createdAt: string;
  receivedAt?: string;
}

interface TimelineEvent {
  id: string;
  status: string;
  title: string;
  description?: string;
  userId: string;
  createdAt: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'DELIVERED': case 'POD_SIGNED': case 'RELEASED': return 'success' as const;
    case 'IN_TRANSIT': case 'MANIFESTED': case 'LOADED': case 'DEPARTED': return 'info' as const;
    case 'ACCEPTED': case 'RCS': case 'INITIATED': return 'pending' as const;
    case 'CUSTOMS_HOLD': case 'CUSTOMS_QUERY': case 'UNDER_CLEARANCE': return 'warning' as const;
    case 'CANCELLED': case 'OFFLOADED': return 'error' as const;
    default: return 'pending' as const;
  }
};

const validTransitions: Record<string, string[]> = {
  INITIATED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['RCS', 'CANCELLED'],
  RCS: ['MANIFESTED', 'CANCELLED'],
  MANIFESTED: ['LOADED', 'CANCELLED'],
  LOADED: ['DEPARTED'],
  DEPARTED: ['IN_TRANSIT'],
  IN_TRANSIT: ['ARRIVED', 'CUSTOMS_HOLD'],
  ARRIVED: ['UNDER_CLEARANCE', 'RELEASED'],
  UNDER_CLEARANCE: ['CUSTOMS_HOLD', 'RELEASED'],
  CUSTOMS_HOLD: ['UNDER_CLEARANCE', 'CANCELLED'],
  RELEASED: ['AWAITING_DELIVERY'],
  AWAITING_DELIVERY: ['OUT_FOR_DELIVERY', 'PICKED_UP'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  PICKED_UP: ['POD_SIGNED'],
  DELIVERED: ['POD_SIGNED'],
  CANCELLED: [],
  POD_SIGNED: [],
};

export default function ExportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [detailRes, timelineRes] = await Promise.all([
        fetch(`/api/master-awbs/${params.id}`),
        fetch(`/api/timeline/MasterAWB/${params.id}`),
      ]);
      const detailJson = await detailRes.json();
      if (detailJson.success) {
        setShipment(detailJson.data);
      } else {
        setError(detailJson.error || 'Failed to load shipment');
      }
      const timelineJson = await timelineRes.json();
      if (timelineJson.success) {
        setTimeline(timelineJson.data || []);
      }
    } catch {
      setError('Failed to load shipment details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [params.id]);

  const handleTransition = async (newStatus: string) => {
    if (!shipment) return;
    setIsTransitioning(true);
    try {
      const res = await fetch(`/api/master-awbs/${shipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargoStatus: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchDetail();
      }
    } finally {
      setIsTransitioning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <SkeletonCard />
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Shipment Not Found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <Button className="mt-4" onClick={fetchDetail}>
            <RefreshCw className="mr-1 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const nextTransitions = validTransitions[shipment.cargoStatus] || [];
  const isTerminal = ['CANCELLED', 'DELIVERED', 'POD_SIGNED'].includes(shipment.cargoStatus);

  return (
    <div className="space-y-6">
      <PageHeader
        title={shipment.awbNumber}
        description={`Tracking: ${shipment.trackingNumber}`}
        breadcrumbs={[
          { label: 'Workspace', href: '/workspace' },
          { label: 'Export Operations', href: '/workspace/export' },
          { label: shipment.awbNumber },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchDetail}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/workspace/export')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to List
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Shipment Overview</h2>
              <StatusBadge status={statusVariant(shipment.cargoStatus)} label={shipment.cargoStatus.replace(/_/g, ' ')} />
            </div>
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{shipment.shipmentType?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Payment Mode</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{shipment.paymentMode}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Currency</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{shipment.currency}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Customs Value</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {shipment.currency} {shipment.customsValue.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:grid-cols-5">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pieces</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{shipment.awbPieces}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Weight</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{shipment.awbWeight} kg</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Volume</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{shipment.volume.toFixed(2)} m³</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Chargeable</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{shipment.chargeableWeight.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Flight</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{shipment.flightNumber || '—'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Sender</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="h-4 w-4 shrink-0" />
                  <span>{shipment.senderName}</span>
                </div>
                {shipment.senderCompany && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{shipment.senderCompany}</span>
                  </div>
                )}
                {shipment.senderPhone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Hash className="h-4 w-4 shrink-0" />
                    <span>{shipment.senderPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{shipment.senderAddress}</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Receiver</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="h-4 w-4 shrink-0" />
                  <span>{shipment.receiverName}</span>
                </div>
                {shipment.receiverCompany && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{shipment.receiverCompany}</span>
                  </div>
                )}
                {shipment.receiverPhone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Hash className="h-4 w-4 shrink-0" />
                    <span>{shipment.receiverPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{shipment.receiverAddress}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Route</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                {shipment.originStation?.code || '?'}
              </div>
              <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
              <Plane className="h-4 w-4 text-gray-400" />
              <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-sm font-bold text-green-600 dark:bg-green-950 dark:text-green-400">
                {shipment.destinationStation?.code || '?'}
              </div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{shipment.originStation?.name || 'Unknown'}</span>
              <span>{shipment.destinationStation?.name || 'Unknown'}</span>
            </div>
          </div>

          {!isTerminal && nextTransitions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Status Transition</h3>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Current: <span className="font-medium text-gray-700 dark:text-gray-300">{shipment.cargoStatus.replace(/_/g, ' ')}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {nextTransitions.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={status === 'CANCELLED' ? 'destructive' : 'default'}
                    onClick={() => handleTransition(status)}
                    disabled={isTransitioning}
                  >
                    {isTransitioning ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : status === 'CANCELLED' ? (
                      <XCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    )}
                    {status.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {shipment.houseAWBs.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  House AWBs ({shipment.houseAWBs.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {shipment.houseAWBs.map((ha) => (
                  <HawbRow key={ha.id} hawb={ha} onRefresh={fetchDetail} />
                ))}
              </div>
            </div>
          )}
          <AddHouseAWBForm masterAWBId={shipment.id} onCreated={fetchDetail} />
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Dates</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>Created</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">
                  {new Date(shipment.createdAt).toLocaleDateString()}
                </span>
              </div>
              {shipment.receivedAt && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>Received</span>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(shipment.receivedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Status History</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No history available</p>
            ) : (
              <div className="space-y-0">
                {timeline.map((event, idx) => (
                  <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < timeline.length - 1 && (
                      <div className="absolute left-[7px] top-4 h-full w-px bg-gray-200 dark:bg-gray-700" />
                    )}
                    <div className={cn(
                      'mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2',
                      statusVariant(event.status) === 'success' ? 'border-green-500 bg-green-100 dark:bg-green-900/30' :
                      statusVariant(event.status) === 'info' ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30' :
                      statusVariant(event.status) === 'warning' ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' :
                      statusVariant(event.status) === 'error' ? 'border-red-500 bg-red-100 dark:bg-red-900/30' :
                      'border-gray-400 bg-gray-100 dark:bg-gray-800'
                    )} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HawbRow({ hawb, onRefresh }: { hawb: ShipmentDetail['houseAWBs'][0]; onRefresh: () => void }) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState('');

  const handleMoveToHKG = async () => {
    setMoving(true);
    setMoveError('');
    try {
      const res = await fetch(`/api/house-awbs/${hawb.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationStationId: 'd6d35225-96dc-46fb-b3dc-2a3a0efbad4b' }),
      });
      const json = await res.json();
      if (!json.success) { setMoveError(json.error || 'Transfer failed'); return; }
      onRefresh();
    } catch {
      setMoveError('Transfer failed');
    } finally {
      setMoving(false);
    }
  };

  const isHkg = hawb.shipmentType === 'HKG_HONGKONG';
  const billingVar = (s: string) => { const u = s.toUpperCase(); return u === 'PAID' ? 'success' : u === 'CREDITED' ? 'info' : 'pending'; };

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="flex-1 min-w-0">
        <button type="button" onClick={() => router.push(`/workspace/house-awb/${hawb.id}`)} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          {hawb.houseAWBNumber}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">{hawb.pieces} pcs · {hawb.weight} kg · {hawb.parcels.length} parcels · {hawb.shipmentType?.replace(/_/g, ' ')}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {moveError && <span className="text-xs text-red-500">{moveError}</span>}
        {!isHkg && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600" onClick={handleMoveToHKG} disabled={moving}>
            {moving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plane className="h-3 w-3" />}
            HKG
          </Button>
        )}
        <StatusBadge status={billingVar(hawb.billingStatus)} label={hawb.billingStatus.replace(/_/g, ' ')} />
        <StatusBadge status={statusVariant(hawb.cargoStatus)} label={hawb.cargoStatus.replace(/_/g, ' ')} />
      </div>
    </div>
  );
}

function AddHouseAWBForm({ masterAWBId, onCreated }: { masterAWBId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [awbTypes, setAwbTypes] = useState<{ code: string; name: string; label: string }[]>([]);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [saving, setSaving] = useState<'saving' | 'saved' | null>(null);
  const draftKey = `sifex_add_hawb_draft_${masterAWBId}`;

  interface SR { name: string; company: string; phone: string; address: string; city: string; country: string; }
  interface PL { description: string; quantity: number; weight: number; length: number; width: number; height: number; }
  interface FState {
    sender: SR; receiver: SR;
    description: string; orderNumber: string; terms: string; insurance: string;
    awbType: string; paymentMode: string; currency: string; customsValue: string;
    dateReceived: string; expectedArrivalDate: string;
    parcels: PL[];
    freightRate: number; chargeableWeight: number; freightAmount: number;
  }

  const emptySR = (): SR => ({ name: '', company: '', phone: '', address: '', city: '', country: '' });
  const defaultState = (): FState => ({
    sender: emptySR(), receiver: emptySR(),
    description: '', orderNumber: '', terms: '', insurance: '',
    awbType: '', paymentMode: 'PP', currency: 'USD', customsValue: '',
    dateReceived: '', expectedArrivalDate: '',
    parcels: [{ description: '', quantity: 1, weight: 0, length: 0, width: 0, height: 0 }],
    freightRate: 0, chargeableWeight: 0, freightAmount: 0,
  });
  const calcVw = (l: number, w: number, h: number) => Math.round((l * w * h) / 6000);

  const [f, setF] = useState<FState>(defaultState());
  const [submitError, setSubmitError] = useState('');
  const loaded = useRef(false);
  const firstOpen = useRef(true);

  useEffect(() => {
    fetch('/api/awb-types').then(r => r.ok && r.json()).then(j => setAwbTypes(j?.data || [])).catch(() => {});
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sender?.name || parsed.receiver?.name) {
          setShowDraftBanner(true);
        }
      }
    } catch {}
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current || !open) return;
    if (showDraftBanner) return;
    if (firstOpen.current) { firstOpen.current = false; return; }
    setSaving('saving');
    const timer = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(f)); } catch {}
      setSaving('saved');
    }, 800);
    return () => clearTimeout(timer);
  }, [f, open, showDraftBanner]);

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setF({ ...defaultState(), ...JSON.parse(saved) });
    } catch {}
    setShowDraftBanner(false);
  };
  const clearDraft = () => { localStorage.removeItem(draftKey); setShowDraftBanner(false); setF(defaultState()); };

  const updateSender = (field: keyof SR, value: string) => setF(p => ({ ...p, sender: { ...p.sender, [field]: value } }));
  const updateReceiver = (field: keyof SR, value: string) => setF(p => ({ ...p, receiver: { ...p.receiver, [field]: value } }));
  const updateField = (field: keyof FState, value: unknown) => setF(p => ({ ...p, [field]: value }));

  const handleAwbTypeChange = (awbType: string) => {
    setF(p => ({ ...p, awbType }));
    if (!awbType) return;
    fetch(`/api/freight-rates?shipmentType=${encodeURIComponent(awbType)}&isActive=true`)
      .then(r => r.ok ? r.json() : Promise.resolve({}))
      .then(j => {
        const rates = j.data || j;
        if (rates.length > 0) {
          const rate = parseFloat(rates[0].ratePerKg) || 0;
          setF(p => ({ ...p, freightRate: rate, freightAmount: rate * p.chargeableWeight, currency: rates[0].currency || p.currency }));
        }
      })
      .catch(() => {});
  };

  const updateParcel = (idx: number, field: keyof PL, value: number | string) => {
    setF(p => {
      const parcels = p.parcels.map((pl, i) => i === idx ? { ...pl, [field]: value } : pl);
      const totalW = parcels.reduce((s, pl) => s + Number(pl.weight), 0);
      const totalVw = parcels.reduce((s, pl) => s + calcVw(pl.length, pl.width, pl.height), 0);
      const cw = Math.max(totalW, totalVw);
      return { ...p, parcels, chargeableWeight: cw, freightAmount: cw * p.freightRate };
    });
  };
  const addParcel = () => setF(p => ({ ...p, parcels: [...p.parcels, { description: '', quantity: 1, weight: 0, length: 0, width: 0, height: 0 }] }));
  const removeParcel = (idx: number) => {
    if (f.parcels.length <= 1) return;
    setF(p => {
      const parcels = p.parcels.filter((_, i) => i !== idx);
      const totalW = parcels.reduce((s, pl) => s + Number(pl.weight), 0);
      const totalVw = parcels.reduce((s, pl) => s + calcVw(pl.length, pl.width, pl.height), 0);
      return { ...p, parcels, chargeableWeight: Math.max(totalW, totalVw), freightAmount: p.freightRate * Math.max(totalW, totalVw) };
    });
  };

  const rf = (label: string, value: string | number, onChange: (v: string) => void, opts?: { type?: string; placeholder?: string; required?: boolean }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}{opts?.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input type={opts?.type || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={opts?.placeholder}
        className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
    </div>
  );

  const handleSubmit = async () => {
    if (!f.sender.name || !f.receiver.name) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const mkCode = (prefix: string) => `SFL-${prefix}-${Date.now()}`;
      const mkHawbNum = () => `HAWB-${Date.now()}`;

      const [shipperRes, receiverRes] = await Promise.all([
        fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.sender.name, company: f.sender.company, phone: f.sender.phone, address: f.sender.address, city: f.sender.city, country: f.sender.country, code: mkCode('SHP'), type: 'COMPANY' }) }),
        fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.receiver.name, company: f.receiver.company, phone: f.receiver.phone, address: f.receiver.address, city: f.receiver.city, country: f.receiver.country, code: mkCode('REC'), type: 'COMPANY' }) }),
      ]);
      if (!shipperRes.ok) { const e = await shipperRes.json().catch(() => null); throw new Error(e?.error || 'Failed to create shipper'); }
      if (!receiverRes.ok) { const e = await receiverRes.json().catch(() => null); throw new Error(e?.error || 'Failed to create receiver'); }
      const shipper = (await shipperRes.json()).data;
      const receiver = (await receiverRes.json()).data;

      const totalW = f.parcels.reduce((s, p) => s + (Number(p.weight) || 0), 0);
      const totalVw = f.parcels.reduce((s, p) => s + calcVw(p.length, p.width, p.height), 0);

      const hawbRes = await fetch('/api/house-awbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterAWBId,
          houseAWBNumber: mkHawbNum(),
          shipperId: shipper.id,
          receiverId: receiver.id,
          pieces: f.parcels.reduce((s, p) => s + (Number(p.quantity) || 0), 0),
          weight: totalW,
          volume: f.parcels.reduce((s, p) => s + (p.length * p.width * p.height), 0) / 1e6,
          chargeableWeight: Math.max(totalW, totalVw),
          volumeWeight: totalVw,
          freight: f.freightAmount,
          freightRate: f.freightRate,
          paymentMode: f.paymentMode,
          currency: f.currency,
          customsValue: parseFloat(f.customsValue) || 0,
          shipmentType: f.awbType,
          description: f.description,
        }),
      });
      if (!hawbRes.ok) { const e = await hawbRes.json().catch(() => null); throw new Error(e?.error || 'Failed to create House AWB'); }
      const hawb = (await hawbRes.json()).data;

      for (const p of f.parcels) {
        if (!p.description) continue;
        const ts = Date.now();
        const rng = Math.random().toString(36).slice(2, 6);
        const parcelRes = await fetch('/api/parcels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            houseAWBId: hawb.id,
            parcelTrackingNumber: `PRC-${ts}-${rng}`,
            barcode: `BAR-${ts}-${rng}`,
            description: p.description,
            quantity: Number(p.quantity) || 1,
            actualWeight: Number(p.weight) || 0,
            length: p.length, width: p.width, height: p.height,
            volume: (p.length * p.width * p.height) / 1e6,
            volumetricWeight: calcVw(p.length, p.width, p.height),
          }),
        });
        if (!parcelRes.ok) { const e = await parcelRes.json().catch(() => null); throw new Error(e?.error || 'Failed to create parcel'); }
      }

      clearDraft();
      setOpen(false);
      setF(defaultState());
      firstOpen.current = true;
      onCreated();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSubmitError(''); }}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-blue-500" /> Add House AWB
          {saving === 'saving' && <span className="ml-2 flex items-center gap-1 text-xs text-blue-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />Saving to draft...</span>}
          {saving === 'saved' && <span className="ml-2 flex items-center gap-1 text-xs text-green-500"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Draft saved</span>}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {showDraftBanner && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2 text-sm dark:bg-amber-950/30">
          <span className="text-amber-700 dark:text-amber-300">You have a saved draft for this House AWB.</span>
          <div className="flex gap-2">
            <button type="button" onClick={loadDraft} className="text-amber-700 underline hover:no-underline dark:text-amber-300">Resume</button>
            <button type="button" onClick={clearDraft} className="text-gray-500 underline hover:no-underline dark:text-gray-400">Discard</button>
          </div>
        </div>
      )}
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Shipper (Sender)</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {rf('Name', f.sender.name, v => updateSender('name', v), { required: true })}
                {rf('Company', f.sender.company, v => updateSender('company', v))}
                {rf('Phone', f.sender.phone, v => updateSender('phone', v))}
                {rf('Address', f.sender.address, v => updateSender('address', v))}
                {rf('City', f.sender.city, v => updateSender('city', v))}
                {rf('Country', f.sender.country, v => updateSender('country', v))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Consignee (Receiver)</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {rf('Name', f.receiver.name, v => updateReceiver('name', v), { required: true })}
                {rf('Company', f.receiver.company, v => updateReceiver('company', v))}
                {rf('Phone', f.receiver.phone, v => updateReceiver('phone', v))}
                {rf('Address', f.receiver.address, v => updateReceiver('address', v))}
                {rf('City', f.receiver.city, v => updateReceiver('city', v))}
                {rf('Country', f.receiver.country, v => updateReceiver('country', v))}
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Shipment Details</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {rf('Description', f.description, v => updateField('description', v), { required: true, placeholder: 'Goods description' })}
              {rf('Order Number', f.orderNumber, v => updateField('orderNumber', v), { placeholder: 'Customer order ref' })}
              {rf('Terms', f.terms, v => updateField('terms', v), { placeholder: 'e.g. FOB, CIF' })}
              {rf('Insurance', f.insurance, v => updateField('insurance', v), { placeholder: '0.00' })}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">AWB Type</label>
                <select value={f.awbType} onChange={e => handleAwbTypeChange(e.target.value)}
                  className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  <option value="">Select type</option>
                  {awbTypes.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Payment Mode</label>
                <select value={f.paymentMode} onChange={e => updateField('paymentMode', e.target.value)}
                  className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  <option value="PP">Prepaid (PP)</option>
                  <option value="CC">Collect (CC)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Currency</label>
                <select value={f.currency} onChange={e => updateField('currency', e.target.value)}
                  className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  <option value="USD">USD</option>
                  <option value="TZS">TZS</option>
                  <option value="KES">KES</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              {rf('Customs Value', f.customsValue, v => updateField('customsValue', v))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Date Received</label>
                <DatePicker value={f.dateReceived} onChange={v => updateField('dateReceived', v)} placeholder="Select date" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Expected Arrival Date</label>
                <DatePicker value={f.expectedArrivalDate} onChange={v => updateField('expectedArrivalDate', v)} placeholder="Select date" />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Parcels / Items</h4>
              <button type="button" onClick={addParcel} className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                <Plus className="h-3 w-3" /> Add Parcel
              </button>
            </div>
            {f.parcels.map((parcel, pIdx) => (
              <div key={pIdx} className="mb-2 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Parcel #{pIdx + 1}</span>
                  {f.parcels.length > 1 && (
                    <button type="button" onClick={() => removeParcel(pIdx)} className="text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {rf('Description', parcel.description, v => updateParcel(pIdx, 'description', v), { required: true, placeholder: 'Item' })}
                  {rf('Qty', parcel.quantity, v => updateParcel(pIdx, 'quantity', Number(v)), { type: 'number' })}
                  {rf('Weight (kg)', parcel.weight, v => updateParcel(pIdx, 'weight', Number(v)), { type: 'number' })}
                  {rf('Length (cm)', parcel.length, v => updateParcel(pIdx, 'length', Number(v)), { type: 'number' })}
                  {rf('Width (cm)', parcel.width, v => updateParcel(pIdx, 'width', Number(v)), { type: 'number' })}
                  {rf('Height (cm)', parcel.height, v => updateParcel(pIdx, 'height', Number(v)), { type: 'number' })}
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>Volume: {(parcel.length * parcel.width * parcel.height).toLocaleString()} cm³</span>
                  <span>Vol. Wt: {calcVw(parcel.length, parcel.width, parcel.height)} kg</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Volume Summary</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Volume</label>
                <div className="flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  {f.parcels.reduce((s, p) => s + (p.length * p.width * p.height) * Number(p.quantity), 0).toLocaleString()} cm³
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Volumetric Weight</label>
                <div className="flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  {f.parcels.reduce((s, p) => s + calcVw(p.length, p.width, p.height), 0)} kg
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Actual Weight</label>
                <div className="flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  {f.parcels.reduce((s, p) => s + Number(p.weight), 0)} kg
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Freight</h4>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Rate (per kg)</label>
                  <div className="flex h-8 items-center rounded-lg border border-blue-200 bg-white px-3 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-400">
                    {f.freightRate ? `${f.freightRate.toFixed(2)} ${f.currency}` : '—'}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Chargeable Weight</label>
                  <div className="flex h-8 items-center rounded-lg border border-blue-200 bg-white px-3 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-400">
                    {f.chargeableWeight} kg
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Freight Amount</label>
                  <div className="flex h-8 items-center rounded-lg border border-green-200 bg-white px-3 text-sm font-bold text-green-700 dark:border-green-800 dark:bg-gray-900 dark:text-green-400">
                    ${f.freightAmount.toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                {f.freightRate} × {f.chargeableWeight} = ${f.freightAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); }}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!f.sender.name || !f.receiver.name || submitting}>
              {submitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
              Create House AWB
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
