'use client';

import { useState } from 'react';
import { Plane, PlaneTakeoff, PlaneLanding, Clock, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

const mockFlights = [
  { flight: 'SX-452', origin: 'DAR', destination: 'NBO', status: 'On Time' as const, departure: '14:30', cargo: 128 },
  { flight: 'SX-891', origin: 'NBO', destination: 'DXB', status: 'Boarding' as const, departure: '15:00', cargo: 89 },
  { flight: 'SX-334', origin: 'DAR', destination: 'ADD', status: 'Delayed' as const, departure: '16:15', cargo: 201 },
  { flight: 'SX-776', origin: 'DXB', destination: 'CAN', status: 'On Time' as const, departure: '17:00', cargo: 67 },
];

export default function FlightsPage() {
  const [flights] = useState(mockFlights);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flights"
        description="Flight scheduling and cargo space management"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Flights' }]}
        action={
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Today's Flights" value="12" icon={<PlaneTakeoff className="h-5 w-5" />} />
        <StatCard label="In Transit" value="8" icon={<Plane className="h-5 w-5" />} />
        <StatCard label="Arrived Today" value="6" icon={<PlaneLanding className="h-5 w-5" />} />
        <StatCard label="Cargo Booked" value="485" icon={<Clock className="h-5 w-5" />} />
      </div>

      {flights.length === 0 ? (
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
            {flights.map((f) => (
              <div key={f.flight} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Plane className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{f.flight}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{f.origin} → {f.destination}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{f.cargo} items</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{f.departure}</span>
                  <StatusBadge
                    status={f.status === 'On Time' ? 'success' : f.status === 'Boarding' ? 'info' : 'warning'}
                    label={f.status}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
