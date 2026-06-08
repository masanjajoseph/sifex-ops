'use client';

import { useState } from 'react';
import { Users, Search, RefreshCw, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const mockCustomers = [
  { id: '1', name: 'Tanzania Cargo Ltd', code: 'TCL-001', email: 'info@tzcargo.co.tz', status: 'ACTIVE' as const, shipments: 45 },
  { id: '2', name: 'East African Logistics', code: 'EAL-002', email: 'ops@ealogistics.co.ke', status: 'ACTIVE' as const, shipments: 32 },
  { id: '3', name: 'Global Trade Corp', code: 'GTC-003', email: 'shipping@globaltrade.com', status: 'PENDING' as const, shipments: 0 },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');

  const filtered = mockCustomers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customer accounts and relationships"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Customers' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Customer
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Customers" value={mockCustomers.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active Accounts" value={mockCustomers.filter(c => c.status === 'ACTIVE').length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total Shipments" value={mockCustomers.reduce((a, c) => a + c.shipments, 0)} icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={mockCustomers.length === 0 ? 'No customers yet' : 'No results'}
          description="Customer profiles will appear once created."
          action={mockCustomers.length === 0 ? <Button><Plus className="mr-1 h-4 w-4" /> Add Customer</Button> : undefined}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">All Customers</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.code} · {c.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{c.shipments} shipments</span>
                  <StatusBadge
                    status={c.status === 'ACTIVE' ? 'success' : 'pending'}
                    label={c.status}
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
