'use client';

import { FileText, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

const mockQuotes = [
  { id: 'Q-001', customer: 'Tanzania Cargo Ltd', type: 'Air Freight', amount: 2450, status: 'APPROVED' as const, date: '2026-05-26' },
  { id: 'Q-002', customer: 'East African Logistics', type: 'Consolidation', amount: 3800, status: 'PENDING' as const, date: '2026-05-25' },
  { id: 'Q-003', customer: 'Global Trade Corp', type: 'Warehousing', amount: 1200, status: 'DRAFT' as const, date: '2026-05-24' },
];

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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        description="Generate freight quotes and manage pricing"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Quotes' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Quote
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Quotes" value={mockQuotes.length} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Pending Approval" value={mockQuotes.filter(q => q.status === 'PENDING').length} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Total Value" value={`$${mockQuotes.reduce((a, q) => a + q.amount, 0).toLocaleString()}`} icon={<FileText className="h-5 w-5" />} />
      </div>

      {mockQuotes.length === 0 ? (
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
            {mockQuotes.map((q) => (
              <div key={q.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{q.customer}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{q.type} · {q.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">${q.amount.toLocaleString()}</span>
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
