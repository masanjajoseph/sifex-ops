'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Search, RefreshCw, Barcode } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/SearchInput';

interface Parcel {
  id: string;
  parcelTrackingNumber: string;
  barcode: string;
  description: string;
  quantity: number;
  actualWeight: number;
  houseAWB: {
    id: string;
    houseAWBNumber: string;
    masterAWB?: { awbNumber: string; id: string } | null;
  } | null;
  createdAt: string;
}

export default function ParcelsPage() {
  const router = useRouter();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchParcels = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/parcels?${params}`);
      const json = await res.json();
      if (json.success) setParcels(json.data || []);
    } catch {
      setParcels([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchParcels(); }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcels"
        description="Track and manage individual parcels within shipments"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Parcels' }]}
        action={
          <Button variant="outline" size="sm" onClick={fetchParcels}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />
      <SearchInput
        placeholder="Search by barcode or tracking number..."
        value={search}
        onChange={setSearch}
        className="max-w-md"
      />
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : parcels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <Package className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Parcels Found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search ? 'No parcels match your search.' : 'Parcels are created when you add items to a House AWB.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {parcels.map((p) => (
              <div
                key={p.id}
                className="flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => {
                  const mawbId = p.houseAWB?.masterAWB?.id;
                  if (mawbId) router.push(`/workspace/export/${mawbId}`);
                }}
              >
                <div className="flex items-center gap-3">
                  <Barcode className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {p.barcode}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {p.parcelTrackingNumber} · {p.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{p.quantity} pc{p.quantity !== 1 ? 's' : ''} · {p.actualWeight} kg</span>
                  <span>{p.houseAWB?.houseAWBNumber || '—'}</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
