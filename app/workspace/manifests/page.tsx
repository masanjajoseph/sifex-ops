'use client';

import { useState } from 'react';
import { FileSpreadsheet, RefreshCw, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

const mockManifests = [
  { id: 'MFT-001', flight: 'SX-452', origin: 'DAR', destination: 'NBO', status: 'CREATED' as const, items: 45, created: '2026-05-26' },
  { id: 'MFT-002', flight: 'SX-891', origin: 'NBO', destination: 'DXB', status: 'CONFIRMED' as const, items: 32, created: '2026-05-26' },
  { id: 'MFT-003', flight: 'SX-334', origin: 'DAR', destination: 'ADD', status: 'LOADED' as const, items: 78, created: '2026-05-25' },
];

const statusVariant = (s: string) => {
  switch (s) {
    case 'LOADED': case 'DEPARTED': return 'info' as const;
    case 'CONFIRMED': return 'success' as const;
    case 'CREATED': return 'pending' as const;
    default: return 'pending' as const;
  }
};

export default function ManifestsPage() {
  const [manifests] = useState(mockManifests);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargo Manifests"
        description="Create and manage cargo manifests for air transport"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Manifests' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Manifest
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Manifests" value={manifests.length} icon={<FileSpreadsheet className="h-5 w-5" />} />
        <StatCard label="Total Items" value={manifests.reduce((a, m) => a + m.items, 0)} icon={<FileSpreadsheet className="h-5 w-5" />} />
        <StatCard label="Loaded Today" value={manifests.filter(m => m.status === 'LOADED').length} icon={<FileSpreadsheet className="h-5 w-5" />} />
      </div>

      {manifests.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet className="h-12 w-12" />}
          title="No manifests yet"
          description="Create a manifest to consolidate shipments for a flight."
          action={<Button><Plus className="mr-1 h-4 w-4" /> New Manifest</Button>}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">All Manifests</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {manifests.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.id}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.flight} · {m.origin} → {m.destination} · {m.items} items</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{m.created}</span>
                  <StatusBadge status={statusVariant(m.status)} label={m.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
