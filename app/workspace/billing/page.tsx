'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, RefreshCw, DollarSign, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/FilterBar';

interface BillingRecord {
  id: string;
  houseAWBId?: string;
  masterAWBId?: string;
  status: string;
  totalAmount: number;
  currency: string;
  paidAmount: number;
  remainingAmount: number;
  billingCharges: Array<{ type: string; amount: number }>;
  payments: Array<{ amount: number }>;
  createdAt: string;
  invoicedAt?: string;
  fullyPaidAt?: string;
  customer?: { name: string; phone: string | null } | null;
  houseAWB?: { houseAWBNumber: string; masterAWB?: { awbNumber: string } } | null;
}

const statusLabel = (s: string) => {
  const st = s.toLowerCase();
  if (st === 'pa' || st === 'paid') return 'Paid';
  if (st === 'un' || st === 'unpaid' || st === 'draft' || st === 'not_billed' || st === 'invoiced' || st === 'partial_paid') return 'Unpaid';
  if (st === 'cr' || st === 'credited') return 'Credited';
  return s.replace(/_/g, ' ');
};

const statusVariant = (s: string) => {
  const st = s.toLowerCase();
  if (st === 'paid' || st === 'pa') return 'success' as const;
  if (st === 'credited' || st === 'cr') return 'info' as const;
  if (st === 'refunded') return 'error' as const;
  return 'pending' as const;
};

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'unpaid', label: 'Unpaid Only' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CREDITED', label: 'Credited' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export default function BillingPage() {
  const router = useRouter();
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('unpaid');

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter === 'unpaid') {
        params.set('status', 'DRAFT,INVOICED,NOT_BILLED,UNPAID,PARTIAL_PAID');
      } else if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/billing?${params}`);
      const json = await res.json();
      if (json.success) setRecords(json.data || []);
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const totalOutstanding = records.reduce((s, r) => s + r.remainingAmount, 0);
  const totalPaid = records.reduce((s, r) => s + r.paidAmount, 0);
  const pendingCount = records.filter(r => r.status === 'DRAFT' || r.status === 'INVOICED' || r.status === 'PARTIAL_PAID').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage invoices, payments, and financial transactions"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Billing' }]}
        action={
          <Button variant="outline" size="sm" onClick={fetchRecords}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Collected" value={`$${totalPaid.toLocaleString()}`} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Pending" value={pendingCount} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Total" value={records.length} icon={<Receipt className="h-5 w-5" />} />
      </div>
      <FilterBar
        filters={[{
          id: 'status', label: 'Status', options: statusOptions, value: statusFilter,
          onChange: (v) => setStatusFilter(v),
        }]}
        onClearAll={() => setStatusFilter('unpaid')}
      />
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-12 w-12" />}
          title="No invoices yet"
          description="Invoices are automatically generated when shipments are released from customs."
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="grid grid-cols-7 gap-4 border-b border-gray-100 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <span>Invoice#</span>
            <span>HAWB</span>
            <span className="col-span-2">Customer</span>
            <span>Amount</span>
            <span>Date</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="grid cursor-pointer grid-cols-7 gap-4 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => router.push(`/workspace/billing/${r.id}`)}
                >
                  <div className="col-span-1">
                    <p className="text-sm text-gray-900 dark:text-white">#{r.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm text-gray-900 dark:text-white">{r.houseAWB?.houseAWBNumber || '-'}</p>
                    {r.houseAWB?.masterAWB?.awbNumber && <p className="text-xs text-gray-400">{r.houseAWB.masterAWB.awbNumber}</p>}
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.customer?.name ?? 'Unknown'}</p>
                    {r.customer?.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{r.customer.phone}</p>}
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm text-gray-900 dark:text-white">{r.currency} {r.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <StatusBadge status={statusVariant(r.status)} label={statusLabel(r.status)} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
