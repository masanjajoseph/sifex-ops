'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plane, PlaneTakeoff, PlaneLanding, Clock, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';

interface FlightItem {
  id: string;
  flightNumber: string;
  originStationId: string;
  destinationStationId: string;
  status: string;
  departureTime: string;
  arrivalTime: string;
  totalCapacity: number;
  availableCapacity: number;
  originStation?: { code: string; name: string };
  destinationStation?: { code: string; name: string };
}

const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'info' | 'pending' => {
  switch (s) {
    case 'SCHEDULED': return 'pending';
    case 'BOARDING': return 'info';
    case 'DEPARTED': return 'success';
    case 'ARRIVED': case 'LANDED': return 'success';
    case 'DELAYED': return 'warning';
    case 'CANCELLED': return 'error';
    default: return 'pending';
  }
};

export default function FlightsPage() {
  const [data, setData] = useState<FlightItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flights?limit=50');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => ({
    today: data.length,
    inTransit: data.filter((f) => f.status === 'DEPARTED' || f.status === 'BOARDING').length,
    arrived: data.filter((f) => f.status === 'ARRIVED' || f.status === 'LANDED').length,
    cargoBooked: data.reduce((s, f) => s + (f.totalCapacity - f.availableCapacity), 0),
  }), [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flights"
        description="Flight scheduling and cargo space management"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Flights' }]}
        action={
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Today&apos;s Flights" value={stats.today} icon={<PlaneTakeoff className="h-5 w-5" />} />
        <StatCard label="In Transit" value={stats.inTransit} icon={<Plane className="h-5 w-5" />} />
        <StatCard label="Arrived Today" value={stats.arrived} icon={<PlaneLanding className="h-5 w-5" />} />
        <StatCard label="Cargo Booked" value={stats.cargoBooked} icon={<Clock className="h-5 w-5" />} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Plane className="h-12 w-12" />}
          title="No flights scheduled"
          description="Flight schedules will appear here once configured."
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Active Flights</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Plane className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{f.flightNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{f.originStation?.code || f.originStationId} → {f.destinationStation?.code || f.destinationStationId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round(f.totalCapacity - f.availableCapacity)} items</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{new Date(f.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <StatusBadge status={statusVariant(f.status)} label={f.status.replace(/_/g, ' ')} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
