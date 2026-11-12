'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, Plane, Warehouse, Truck, CheckCircle, DollarSign,
  FileText, Clock, ArrowRight, Search
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useCustomer } from '../layout';

export default function CustomerDashboard() {
  const router = useRouter();
  const { customer, logout } = useCustomer();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trackingInput, setTrackingInput] = useState('');

  useEffect(() => {
    fetch('/api/customer/dashboard')
      .then(r => r.json())
      .then(d => { if (d.data) setStats(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: 'In Transit', value: stats?.inTransit ?? '-', icon: Plane, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'At Origin', value: stats?.atOrigin ?? '-', icon: Package, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Customs', value: stats?.customs ?? '-', icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'In Store', value: stats?.inStore ?? '-', icon: Warehouse, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Out for Delivery', value: stats?.outForDelivery ?? '-', icon: Truck, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Delivered', value: stats?.delivered ?? '-', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo size="sm" priority container containerClassName="bg-white p-2" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{customer?.name}</span>
            <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-xl font-bold text-white">Welcome, {customer?.name?.split(' ')[0] || 'Customer'}</h1>
          <p className="text-sm text-gray-400">Track your shipments and manage your account</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input value={trackingInput} onChange={e => setTrackingInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && trackingInput) router.push(`/customer/shipments?search=${trackingInput}`); }}
              placeholder="Search by AWB, HAWB, or tracking number..."
              className="flex h-10 w-full rounded-lg border border-gray-800 bg-gray-900 pl-9 pr-3 text-sm text-white placeholder-gray-500" />
          </div>
          <button onClick={() => router.push('/customer/shipments')}
            className="flex items-center gap-1 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700">
            All Shipments <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-900" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {kpis.map(k => (
              <div key={k.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{k.label}</span>
                  <div className={`rounded-lg ${k.bg} p-1.5`}>
                    <k.icon className={`h-4 w-4 ${k.color}`} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{k.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Invoices</h2>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Outstanding</span>
                <span className="font-medium text-red-400">{stats?.outstandingCount ?? '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Invoiced</span>
                <span className="font-medium text-white">{stats?.totalInvoiced ?? '-'}</span>
              </div>
              <button onClick={() => router.push('/customer/invoices')}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300">
                View Invoices <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Documents</h2>
              <FileText className="h-4 w-4 text-gray-500" />
            </div>
            <p className="mt-3 text-sm text-gray-400">Access your shipment documents, HAWBs, and invoices.</p>
            <button onClick={() => router.push('/customer/documents')}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300">
              View Documents <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-sm font-semibold text-white">Quick Links</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Request Quote', path: '/customer/request-quote', icon: FileText },
                { label: 'All Shipments', path: '/customer/shipments', icon: Package },
                { label: 'Invoices', path: '/customer/invoices', icon: DollarSign },
                { label: 'Documents', path: '/customer/documents', icon: FileText },
                { label: 'Support', path: '/customer/support', icon: Clock },
              ].map(link => (
                <button key={link.path} onClick={() => router.push(link.path)}
                  className="flex items-center gap-2 rounded-lg border border-gray-800 px-3 py-2.5 text-sm text-gray-300 hover:border-gray-700 hover:text-white">
                  <link.icon className="h-4 w-4 text-purple-500" /> {link.label}
                </button>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
