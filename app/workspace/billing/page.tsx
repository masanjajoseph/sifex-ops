'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, RefreshCw, DollarSign, FileText, CheckCircle, Printer, Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/FilterBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PinInput } from '@/components/ui/PinInput';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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

interface DashboardStats {
  waitingPayment: number;
  paidToday: number;
  totalOutstanding: number;
  totalCollected: number;
  totalInvoiced: number;
  totalRecords: number;
}

const statusLabel = (s: string) => {
  if (s === 'WAITING_PAYMENT') return 'Unpaid';
  if (s === 'PAID') return 'Paid';
  if (s === 'CREDITED') return 'Credited';
  return s.replace(/_/g, ' ');
};

const statusVariant = (s: string) => {
  if (s === 'PAID') return 'success' as const;
  if (s === 'CREDITED') return 'info' as const;
  if (s === 'WAITING_PAYMENT' || s === 'UNPAID') return 'warning' as const;
  if (s === 'REFUNDED') return 'error' as const;
  return 'pending' as const;
};

const statusOptions = [
  { value: 'WAITING_PAYMENT', label: 'Unpaid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CREDITED', label: 'Credited' },
  { value: 'all', label: 'All' },
];

export default function BillingPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    waitingPayment: 0, paidToday: 0, totalOutstanding: 0,
    totalCollected: 0, totalInvoiced: 0, totalRecords: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('WAITING_PAYMENT');
  const [payRecord, setPayRecord] = useState<BillingRecord | null>(null);
  const [payMethod, setPayMethod] = useState('CASH');
  const [payPin, setPayPin] = useState('');
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const [recordsRes, statsRes] = await Promise.all([
        fetch(`/api/billing?${params}`),
        fetch('/api/dashboard/billing'),
      ]);
      if (recordsRes.ok) { const j = await recordsRes.json(); setRecords(j.data || []); }
      if (statsRes.ok) { const j = await statsRes.json(); if (j.success) setStats(j.data); }
    } catch { setRecords([]); } finally { setIsLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleReceivePayment = async () => {
    if (!payRecord || paySaving) return;
    setPaySaving(true);
    setPayError('');
    try {
      const signRes = await fetch(`/api/billing/${payRecord.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: payPin }),
      });
      if (!signRes.ok) {
        const err = await signRes.json();
        setPayError(err.error || 'Invalid PIN');
        setPaySaving(false);
        return;
      }
      const payRes = await fetch(`/api/payments/confirm/${payRecord.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: payMethod, reference: `MANUAL-${Date.now()}` }),
      });
      if (!payRes.ok) {
        const err = await payRes.json();
        setPayError(err.error || 'Payment failed');
      } else {
        setPayRecord(null);
        setPayPin('');
        setPayMethod('CASH');
        fetchRecords();
      }
    } catch { setPayError('Transaction failed'); }
    setPaySaving(false);
  };

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
        <StatCard label="Waiting Payment" value={stats.waitingPayment} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Paid Today" value={stats.paidToday} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Outstanding" value={`$${stats.totalOutstanding.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Collected" value={`$${stats.totalCollected.toLocaleString()}`} icon={<Receipt className="h-5 w-5" />} />
      </div>
      <FilterBar
        filters={[{
          id: 'status', label: 'Status', options: statusOptions, value: statusFilter,
          onChange: (v) => setStatusFilter(v),
        }]}
        onClearAll={() => setStatusFilter('WAITING_PAYMENT')}
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
          title="No invoices"
          description={statusFilter === 'WAITING_PAYMENT' ? 'All invoices have been paid.' : 'No invoices match the selected filter.'}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="grid grid-cols-8 gap-4 border-b border-gray-100 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <span>Invoice#</span>
            <span>HAWB</span>
            <span className="col-span-2">Customer</span>
            <span>Amount</span>
            <span>Date</span>
            <span className="text-center">Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {records.map((r) => (
              <div
                key={r.id}
                className="grid cursor-pointer grid-cols-8 gap-4 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => router.push(`/workspace/billing/${r.id}`)}
              >
                <div><p className="text-sm text-gray-900 dark:text-white">#{r.id.slice(0, 8).toUpperCase()}</p></div>
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{r.houseAWB?.houseAWBNumber || '-'}</p>
                  {r.houseAWB?.masterAWB?.awbNumber && <p className="text-xs text-gray-400">{r.houseAWB.masterAWB.awbNumber}</p>}
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{r.customer?.name ?? 'Unknown'}</p>
                  {r.customer?.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{r.customer.phone}</p>}
                </div>
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{r.currency} {r.totalAmount.toLocaleString()}</p>
                  {r.remainingAmount > 0 && <p className="text-xs text-red-500">Due: {r.currency} {r.remainingAmount.toLocaleString()}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center justify-center">
                  <StatusBadge status={statusVariant(r.status)} label={statusLabel(r.status)} />
                </div>
                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                  {r.status === 'WAITING_PAYMENT' && (
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => { setPayRecord(r); setPayMethod('CASH'); setPayPin(''); setPayError(''); }}>
                      <DollarSign className="mr-1 h-3 w-3" /> Receive Payment
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.open(`/workspace/billing/${r.id}/print`, '_blank')}>
                    <Printer className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                    try { await fetch(`/api/billing/${r.id}/email`, { method: 'POST' }); } catch {}
                  }}>
                    <Mail className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receive Payment Dialog / BottomSheet */}
      {payRecord && (isMobile ? (
        <BottomSheet
          open={!!payRecord}
          onClose={() => { setPayRecord(null); setPayPin(''); setPayError(''); }}
          title="Receive Payment"
          description={`${payRecord.customer?.name || 'Unknown'} • ${payRecord.currency} ${payRecord.totalAmount.toLocaleString()}`}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
                <option value="LIPA_NAMBA">Lipa Namba</option>
              </select>
            </div>
            <PinInput value={payPin} onChange={setPayPin} length={5} label="Signature PIN" error={!!payError} errorMessage={payError || undefined} disabled={paySaving} />
            <Button className="w-full bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handleReceivePayment} disabled={paySaving || payPin.length < 4}>
              {paySaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {paySaving ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </BottomSheet>
      ) : (
        <Dialog open={!!payRecord} onOpenChange={(v) => { if (!v) { setPayRecord(null); setPayPin(''); setPayError(''); } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Receive Payment</DialogTitle>
              <DialogDescription>
                {payRecord?.customer?.name || 'Unknown'} &bull; {payRecord?.currency} {payRecord?.totalAmount.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="LIPA_NAMBA">Lipa Namba</option>
                </select>
              </div>
              <PinInput value={payPin} onChange={setPayPin} length={5} label="Signature PIN" error={!!payError} errorMessage={payError || undefined} disabled={paySaving} />
              {payError && <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {payError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setPayRecord(null); setPayPin(''); setPayError(''); }}>Cancel</Button>
                <Button size="sm" className="bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handleReceivePayment} disabled={paySaving || payPin.length < 4}>
                  {paySaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  {paySaving ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
