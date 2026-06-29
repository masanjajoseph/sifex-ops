'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Plane, Package, Weight, MapPin, Calendar,
  User, Building2, Hash, RefreshCw, AlertCircle, DollarSign, Barcode,
  ExternalLink, Loader2, Pen, Truck, CheckCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface HAWBDetail {
  id: string;
  houseAWBNumber: string;
  trackingNumber: string;
  description?: string;
  pieces: number;
  weight: number;
  volume: number;
  chargeableWeight: number;
  volumeWeight: number;
  freight: number;
  freightRate: number;
  paymentMode: string;
  currency: string;
  customsValue: number;
  cargoStatus: string;
  shipmentType: string;
  createdAt: string;
  shipper: { id: string; name: string; company?: string; phone?: string; address?: string; city?: string; country?: string };
  receiver: { id: string; name: string; company?: string; phone?: string; address?: string; city?: string; country?: string };
  parcels: Array<{
    id: string; description: string; quantity: number; actualWeight: number;
    barcode: string; parcelTrackingNumber: string;
    length: number; width: number; height: number;
  }>;
  masterAWB: {
    id: string; awbNumber: string;
    originStation?: { code: string; name: string };
    destinationStation?: { code: string; name: string };
  } | null;
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

export default function HouseAWBDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [hawb, setHawb] = useState<HAWBDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/house-awbs/${params.id}`);
      const json = await res.json();
      if (json.success) setHawb(json.data);
      else setError(json.error || 'Failed to load');
    } catch {
      setError('Failed to load House AWB');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [params.id]);

  const handleTransferToHKG = async () => {
    if (!hawb) return;
    setTransferring(true);
    try {
      const res = await fetch(`/api/house-awbs/${hawb.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationStationId: 'd6d35225-96dc-46fb-b3dc-2a3a0efbad4b',
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchDetail();
      } else {
        setError(json.error || 'Transfer failed');
      }
    } catch {
      setError('Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !hawb) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">House AWB Not Found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <Button className="mt-4" onClick={fetchDetail}>
            <RefreshCw className="mr-1 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalVolume = hawb.parcels.reduce((s, p) => s + (p.length * p.width * p.height), 0);
  const totalActualW = hawb.parcels.reduce((s, p) => s + p.actualWeight, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={hawb.houseAWBNumber}
        description={`Tracking: ${hawb.trackingNumber}`}
        breadcrumbs={[
          { label: 'Workspace', href: '/workspace' },
          { label: 'House AWBs', href: '/workspace/house-awb' },
          { label: hawb.houseAWBNumber },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchDetail}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            {hawb.shipmentType !== 'HKG_HONGKONG' && (
              <Button size="sm" onClick={handleTransferToHKG} disabled={transferring}>
                {transferring ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plane className="mr-1 h-3 w-3" />}
                Move to HKG
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Shipment Overview</h2>
              <StatusBadge status={statusVariant(hawb.cargoStatus)} label={hawb.cargoStatus.replace(/_/g, ' ')} />
            </div>
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{hawb.shipmentType?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Payment Mode</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{hawb.paymentMode}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Currency</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{hawb.currency}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Customs Value</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {hawb.currency} {hawb.customsValue.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:grid-cols-5">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pieces</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{hawb.pieces}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Weight</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{hawb.weight} kg</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Volume</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{(hawb.volume || totalVolume / 1e6).toFixed(2)} m³</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Chargeable</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{hawb.chargeableWeight.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Freight</p>
                <p className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">{hawb.currency} {hawb.freight.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Shipper</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="h-4 w-4 shrink-0" />
                  <span>{hawb.shipper.name}</span>
                </div>
                {hawb.shipper.company && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{hawb.shipper.company}</span>
                  </div>
                )}
                {hawb.shipper.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Hash className="h-4 w-4 shrink-0" />
                    <span>{hawb.shipper.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Receiver</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="h-4 w-4 shrink-0" />
                  <span>{hawb.receiver.name}</span>
                </div>
                {hawb.receiver.company && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{hawb.receiver.company}</span>
                  </div>
                )}
                {hawb.receiver.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Hash className="h-4 w-4 shrink-0" />
                    <span>{hawb.receiver.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {hawb.masterAWB && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Master AWB</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-blue-500" />
                  <button type="button" onClick={() => router.push(`/workspace/export/${hawb.masterAWB!.id}`)} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {hawb.masterAWB.awbNumber}
                  </button>
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{hawb.masterAWB.originStation?.code || '?'} → {hawb.masterAWB.destinationStation?.code || '?'}</span>
                </div>
              </div>
            </div>
          )}

          {hawb.parcels.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Parcels ({hawb.parcels.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {hawb.parcels.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Barcode className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.description || 'No description'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {p.barcode} · {p.parcelTrackingNumber}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {p.quantity} pc{p.quantity !== 1 ? 's' : ''} · {p.actualWeight} kg
                      {p.length > 0 && ` · ${p.length}x${p.width}x${p.height} cm`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Dates</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Created</span>
              </div>
              <span className="text-sm text-gray-900 dark:text-white">
                {new Date(hawb.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {hawb.cargoStatus === 'AWAITING_DELIVERY' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30">
              <h3 className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-300">Delivery Action Required</h3>
              <div className="space-y-3">
                <Button className="w-full" size="sm" onClick={() => setShowPickupModal(true)}>
                  <Pen className="mr-1 h-4 w-4" /> Customer Pickup (Create Note)
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Truck className="mr-1 h-4 w-4" /> Assign for Delivery
                </Button>
              </div>
            </div>
          )}
          {(hawb.cargoStatus === 'PICKED_UP' || hawb.cargoStatus === 'POD_SIGNED') && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm dark:border-green-900/50 dark:bg-green-950/30">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">{hawb.cargoStatus === 'PICKED_UP' ? 'Picked Up' : 'Delivered & Signed'}</h3>
              </div>
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">Delivery completed. Check delivery notes for details.</p>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Cargo Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Parcels</span>
                <span className="font-medium text-gray-900 dark:text-white">{hawb.parcels.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Pieces</span>
                <span className="font-medium text-gray-900 dark:text-white">{hawb.pieces}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Actual Weight</span>
                <span className="font-medium text-gray-900 dark:text-white">{totalActualW.toFixed(1)} kg</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Chargeable Weight</span>
                <span className="font-medium text-gray-900 dark:text-white">{hawb.chargeableWeight} kg</span>
              </div>
              <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Freight</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{hawb.currency} {hawb.freight.toFixed(2)}</span>
                </div>
                {hawb.freightRate > 0 && (
                  <p className="mt-0.5 text-xs text-gray-400">Rate: {hawb.freightRate} / kg</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
