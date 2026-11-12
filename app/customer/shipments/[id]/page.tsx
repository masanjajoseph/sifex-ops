'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Package, CheckCircle, Clock, FileText, DollarSign, Download } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const statusSteps = [
  { key: 'DRAFT', label: 'Booked' },
  { key: 'VALIDATED', label: 'Validated' },
  { key: 'HAWB_GENERATED', label: 'HAWB Generated' },
  { key: 'MAWB_ASSIGNED', label: 'MAWB Assigned' },
  { key: 'MANIFEST_CREATED', label: 'Manifested' },
  { key: 'FLIGHT_ASSIGNED', label: 'Flight Assigned' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'WAREHOUSE_RECEIVING', label: 'At Warehouse' },
  { key: 'AWAITING_STORAGE', label: 'Awaiting Storage' },
  { key: 'STORED', label: 'In Store' },
  { key: 'WAITING_PAYMENT', label: 'Awaiting Payment' },
  { key: 'PAID', label: 'Paid' },
  { key: 'WAITING_ASSIGNMENT', label: 'Awaiting Rider' },
  { key: 'ASSIGNED', label: 'Rider Assigned' },
  { key: 'STARTED', label: 'Out for Delivery' },
  { key: 'ARRIVED', label: 'Arrived' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function CustomerShipmentDetail() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/customer/shipments/${params.id}`)
      .then(r => r.json())
      .then(d => { if (d.data) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 gap-3">
        <Package className="h-12 w-12 text-gray-600" />
        <p className="text-sm text-gray-500">Shipment not found</p>
        <button onClick={() => router.push('/customer/shipments')} className="text-xs text-purple-400 hover:text-purple-300">Back to shipments</button>
      </div>
    );
  }

  const currentStatus = data.workflowStatus || data.masterAWB?.workflowStatus || 'DRAFT';
  const currentStep = statusSteps.findIndex(s => s.key === currentStatus);

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer/shipments')} className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Logo size="xs" priority container containerClassName="bg-white p-2" />
          </div>
          <span className="text-sm font-medium text-white">{data.houseAWBNumber}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Tracking Progress</h2>
            <span className="text-xs text-gray-500">{currentStatus.replace(/_/g, ' ')}</span>
          </div>
          <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-2">
            {statusSteps.slice(0, currentStep + 1).map((step, i) => (
              <div key={step.key} className="flex items-center gap-1 shrink-0">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${i === currentStep ? 'bg-purple-600' : i < currentStep ? 'bg-green-600' : 'bg-gray-800'}`}>
                  {i < currentStep ? <CheckCircle className="h-3 w-3 text-white" /> : <span className="text-[10px] font-medium text-white">{i + 1}</span>}
                </div>
                {i < currentStep && <div className="h-0.5 w-4 bg-green-600" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Shipment Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">HAWB</span><span className="text-white">{data.houseAWBNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">MAWB</span><span className="text-white">{data.masterAWB?.awbNumber || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Pieces</span><span className="text-white">{data.pieces || data.masterAWB?.awbPieces || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Weight</span><span className="text-white">{data.weight || data.masterAWB?.awbWeight || '-'} kg</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Origin</span><span className="text-white">{data.masterAWB?.originStation?.name || data.masterAWB?.originStation?.code || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Destination</span><span className="text-white">{data.masterAWB?.destinationStation?.name || data.masterAWB?.destinationStation?.code || '-'}</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Parties</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-xs text-gray-500">Shipper</span>
                <p className="text-white">{data.shipper?.name || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Receiver</span>
                <p className="text-white">{data.receiver?.name || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {data.timeline && data.timeline.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Timeline</h3>
            <div className="space-y-3">
              {data.timeline.map((t: any, i: number) => (
                <div key={t.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${i === 0 ? 'bg-purple-600' : 'bg-gray-800'}`}>
                      <Clock className="h-3 w-3 text-gray-400" />
                    </div>
                    {i < data.timeline.length - 1 && <div className="h-full w-0.5 bg-gray-800" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm text-white">{t.action?.replace(/_/g, ' ') || t.newStatus?.replace(/_/g, ' ') || 'Update'}</p>
                    <p className="text-xs text-gray-500">{t.notes || ''}</p>
                    <p className="text-xs text-gray-600">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.billingRecords && data.billingRecords.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Invoices</h3>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </div>
            <div className="mt-3 space-y-2">
              {data.billingRecords.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">#{b.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-white">{b.currency} {b.totalAmount.toLocaleString()}</span>
                  <span className={`text-xs ${b.status === 'PAID' ? 'text-green-400' : 'text-yellow-400'}`}>{b.status.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
