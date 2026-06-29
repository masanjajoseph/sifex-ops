'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { TrackingSearch } from '@/components/cargo/TrackingSearch';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface Station {
  id: string;
  code: string;
  name: string;
}

export default function TrackingPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await fetch('/api/stations');
        if (res.ok) {
          const json = await res.json();
          setStations(json.data || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchStations();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tracking"
        description="Real-time shipment tracking and visibility"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Tracking' }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrackingSearch />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Quick Reference</h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Master AWB</p>
                <p className="text-xs">SFX-MAWB-{'{STA}'}-{'{YYYYMMDD}'}-{'{SEQ}'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">House AWB</p>
                <p className="text-xs">SFX-HAWB-{'{YYYYMMDD}'}-{'{SEQ}'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Tracking Events</p>
                <p className="text-xs">Each scan generates a timeline event with timestamp, station, and operator details</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <MapPin className="h-4 w-4 text-blue-500" />
              Supported Stations
            </h3>
            {loading ? (
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded-md" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {stations.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {s.code}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
