'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Plane, Package, Weight, MapPin, Calendar,
  User, Building2, Hash, ExternalLink, RefreshCw, AlertCircle,
  Clock, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/Skeleton';
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
  RELEASED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
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
                  <div key={ha.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ha.houseAWBNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ha.pieces} pcs · {ha.weight} kg · {ha.parcels.length} parcels</p>
                    </div>
                    <StatusBadge status={statusVariant(ha.cargoStatus)} label={ha.cargoStatus.replace(/_/g, ' ')} />
                  </div>
                ))}
              </div>
            </div>
          )}
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
