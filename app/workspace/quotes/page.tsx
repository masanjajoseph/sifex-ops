'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';

interface QuoteItem {
  id: string;
  quoteNumber: string;
  customer: { name: string };
  shipmentType: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'APPROVED': return 'success' as const;
    case 'PENDING': return 'warning' as const;
    case 'DRAFT': return 'pending' as const;
    case 'REJECTED': return 'error' as const;
    default: return 'pending' as const;
  }
};

export default function QuotesPage() {
  const [data, setData] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes?limit=50');
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
    total: data.length,
    pending: data.filter((q) => q.status === 'PENDING').length,
    totalValue: data.reduce((a, q) => a + q.totalAmount, 0),
  }), [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        description="Generate freight quotes and manage pricing"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Quotes' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Quote
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Quotes" value={stats.total} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Pending Approval" value={stats.pending} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Total Value" value={`$${stats.totalValue.toLocaleString()}`} icon={<FileText className="h-5 w-5" />} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No quotes yet"
          description="Create a freight quote for a customer."
          action={<Button><Plus className="mr-1 h-4 w-4" /> New Quote</Button>}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Quotes</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((q) => (
              <div key={q.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{q.customer?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{q.shipmentType?.replace(/_/g, ' ') || 'N/A'} · {q.quoteNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">${q.totalAmount.toLocaleString()}</span>
                  <StatusBadge status={statusVariant(q.status)} label={q.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
