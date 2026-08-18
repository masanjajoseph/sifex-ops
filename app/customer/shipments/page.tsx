'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, Search, ArrowLeft, ArrowRight, FileText, CheckCircle, Plane, Warehouse, Truck, Clock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useCustomer } from '../layout';

const statusIcon = (s: string) => {
  if (['DRAFT', 'VALIDATED', 'HAWB_GENERATED', 'MAWB_ASSIGNED', 'MANIFEST_CREATED', 'FLIGHT_ASSIGNED'].includes(s)) return Plane;
  if (['DISPATCHED', 'IN_TRANSIT'].includes(s)) return Truck;
  if (['RECEIVED', 'VERIFIED', 'WAREHOUSE_RECEIVING', 'AWAITING_STORAGE', 'STORED'].includes(s)) return Warehouse;
  if (['WAITING_PAYMENT', 'PAID'].includes(s)) return FileText;
  if (['WAITING_ASSIGNMENT', 'ASSIGNED', 'STARTED', 'ARRIVED'].includes(s)) return Truck;
  if (['DELIVERED', 'COMPLETED'].includes(s)) return CheckCircle;
  return Package;
};

const statusColor = (s: string) => {
  if (['DELIVERED', 'COMPLETED'].includes(s)) return 'text-green-400';
  if (['DISPATCHED', 'IN_TRANSIT'].includes(s)) return 'text-blue-400';
  if (['RECEIVED', 'VERIFIED', 'WAREHOUSE_RECEIVING'].includes(s)) return 'text-orange-400';
  if (['WAITING_PAYMENT', 'PAID'].includes(s)) return 'text-yellow-400';
  return 'text-gray-400';
};

export default function CustomerShipments() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer } = useCustomer();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    fetch(`/api/customer/shipments?${params}`)
      .then(r => r.json())
      .then(d => setShipments(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer/dashboard')} className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Logo size="xs" priority container containerClassName="bg-white" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{customer?.name}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by AWB or tracking number..."
            className="flex h-10 w-full rounded-lg border border-gray-800 bg-gray-900 pl-9 pr-3 text-sm text-white placeholder-gray-500" />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-900" />)}
          </div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="mb-3 h-12 w-12 text-gray-600" />
            <p className="text-sm text-gray-500">No shipments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map(s => {
              const Icon = statusIcon(s.workflowStatus || '');
              return (
                <div key={s.id} onClick={() => router.push(`/customer/shipments/${s.id}`)}
                  className="cursor-pointer rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gray-800 p-2">
                        <Icon className={`h-4 w-4 ${statusColor(s.workflowStatus || '')}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{s.houseAWBNumber}</p>
                        <p className="text-xs text-gray-500">
                          {s.masterAWB?.awbNumber || '-'}
                          {s.masterAWB?.originStation && s.masterAWB?.destinationStation
                            ? ` · ${s.masterAWB.originStation.code} → ${s.masterAWB.destinationStation.code}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {s.pieces} pcs · {s.weight} kg
                      </span>
                      <span className={`text-xs font-medium ${statusColor(s.workflowStatus || '')}`}>
                        {(s.workflowStatus || 'DRAFT').replace(/_/g, ' ')}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
