'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Search, RefreshCw, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CustomerItem {
  id: string;
  name: string;
  code: string;
  email: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers?limit=100');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(
    () => data.filter((c) =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
    ),
    [data, search]
  );

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((c) => c.isActive).length,
  }), [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customer accounts and relationships"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Customers' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Customer
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Customers" value={stats.total} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active Accounts" value={stats.active} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Pending" value={stats.total - stats.active} icon={<Users className="h-5 w-5" />} />
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

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={data.length === 0 ? 'No customers yet' : 'No results'}
          description="Customer profiles will appear once created."
          action={data.length === 0 ? <Button><Plus className="mr-1 h-4 w-4" /> Add Customer</Button> : undefined}
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.code} · {c.email || 'N/A'}</p>
                  </div>
                </div>
                <StatusBadge status={c.isActive ? 'success' : 'pending'} label={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
