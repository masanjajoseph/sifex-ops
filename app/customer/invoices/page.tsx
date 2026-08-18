'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useCustomer } from '../layout';

export default function CustomerInvoices() {
  const router = useRouter();
  const { customer } = useCustomer();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer/invoices')
      .then(r => r.json())
      .then(d => setInvoices(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalOutstanding = invoices.filter(i => i.status === 'WAITING_PAYMENT')
    .reduce((s, i) => s + i.remainingAmount, 0);

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer/dashboard')} className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Logo size="xs" priority container containerClassName="bg-white" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Total Outstanding</p>
          <p className="text-2xl font-bold text-white">${totalOutstanding.toLocaleString()}</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-900" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <DollarSign className="mb-3 h-12 w-12 text-gray-600" />
            <p className="text-sm text-gray-500">No invoices found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => (
              <div key={inv.id} onClick={() => router.push(`/customer/invoices/${inv.id}`)}
                className="cursor-pointer rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">#{inv.id.slice(0, 8).toUpperCase()}</p>
                      {inv.houseAWB && <span className="text-xs text-gray-500">{inv.houseAWB.houseAWBNumber}</span>}
                    </div>
                    <p className="text-xs text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{inv.currency} {inv.totalAmount.toLocaleString()}</p>
                    {inv.remainingAmount > 0 && (
                      <p className="text-xs text-red-400">Due: {inv.currency} {inv.remainingAmount.toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs font-medium ${inv.status === 'PAID' ? 'text-green-400' : inv.status === 'WAITING_PAYMENT' ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {inv.status === 'PAID' ? <CheckCircle className="mr-1 inline h-3 w-3" /> : null}
                    {inv.status.replace(/_/g, ' ')}
                  </span>
                  <div className="flex gap-2">
                    {inv.status === 'WAITING_PAYMENT' && (
                      <button onClick={() => router.push(`/payment/invoice/${inv.id}`)}
                        className="rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700">
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
                {inv.billingCharges && inv.billingCharges.length > 0 && (
                  <div className="mt-3 border-t border-gray-800 pt-2">
                    {inv.billingCharges.map((c: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs text-gray-400">
                        <span>{c.type?.replace(/_/g, ' ')}{c.description ? ` — ${c.description}` : ''}</span>
                        <span>{inv.currency} {c.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
