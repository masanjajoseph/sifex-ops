'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, AlertCircle, Loader2, Package, MapPin, User, Mail, Phone, Building } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useCustomer } from '../layout';

interface Station {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  type: string;
}

export default function RequestQuotePage() {
  const router = useRouter();
  const { customer, logout } = useCustomer();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    shipperName: '',
    shipperCompany: '',
    shipperAddress: '',
    shipperPhone: '',
    shipperEmail: '',
    description: '',
    pieces: 1,
    weight: 0,
    volume: 0,
    length: 0,
    width: 0,
    height: 0,
    originStationId: '',
    destinationStationId: '',
    shipmentType: 'AIR',
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    fetch('/api/customer/stations')
      .then(r => r.json())
      .then(d => { if (d.success) setStations(d.data); })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customer/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Submission failed'); return; }
      setSubmitted(true);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950">
        <header className="border-b border-gray-800 bg-gray-900/50 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Logo size="sm" priority container containerClassName="bg-white" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{customer?.name}</span>
              <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300">Sign out</button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Quote Request Submitted</h1>
          <p className="mt-2 text-gray-400">Our team will review your request and get back to you with a quotation.</p>
          <div className="mt-8 flex justify-center gap-3">
            <button onClick={() => router.push('/customer/dashboard')}
              className="rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo size="sm" priority container containerClassName="bg-white" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{customer?.name}</span>
            <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-xl font-bold text-white">Request a Quote</h1>
          <p className="text-sm text-gray-400">Fill in your cargo details and we&apos;ll provide a quotation</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <User className="h-4 w-4 text-purple-500" /> Receiver Info (You)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Name</label>
              <input value={customer?.name || ''} disabled
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 text-sm text-gray-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Email</label>
              <input value={customer?.email || ''} disabled
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 text-sm text-gray-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Phone</label>
              <input value={customer?.phone || ''} disabled
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 text-sm text-gray-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Customer Code</label>
              <input value={customer?.code || ''} disabled
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 text-sm text-gray-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Building className="h-4 w-4 text-purple-500" /> Shipper Info (Optional)
          </h2>
          <p className="mb-3 text-xs text-gray-500">Provide sender details if known, or leave blank for our team to fill</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Name</label>
              <input value={form.shipperName} onChange={e => update('shipperName', e.target.value)} placeholder="Shipper name"
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Company</label>
              <input value={form.shipperCompany} onChange={e => update('shipperCompany', e.target.value)} placeholder="Company name"
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-400">Address</label>
              <input value={form.shipperAddress} onChange={e => update('shipperAddress', e.target.value)} placeholder="Street, city, country"
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Phone</label>
              <input value={form.shipperPhone} onChange={e => update('shipperPhone', e.target.value)} placeholder="Phone number"
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Email</label>
              <input value={form.shipperEmail} onChange={e => update('shipperEmail', e.target.value)} type="email" placeholder="Email address"
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Package className="h-4 w-4 text-purple-500" /> Cargo Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Description</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe your cargo (e.g. electronics, clothing, documents)"
                className="flex h-20 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Pieces</label>
                <input value={form.pieces} onChange={e => update('pieces', parseInt(e.target.value) || 0)} type="number" min={1}
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Weight (kg)</label>
                <input value={form.weight} onChange={e => update('weight', parseFloat(e.target.value) || 0)} type="number" min={0} step="0.1"
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Volume (m³)</label>
                <input value={form.volume} onChange={e => update('volume', parseFloat(e.target.value) || 0)} type="number" min={0} step="0.01"
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Dimensions (cm) - Optional</label>
              <div className="grid grid-cols-3 gap-3">
                <input value={form.length} onChange={e => update('length', parseFloat(e.target.value) || 0)} type="number" min={0} placeholder="Length"
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
                <input value={form.width} onChange={e => update('width', parseFloat(e.target.value) || 0)} type="number" min={0} placeholder="Width"
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
                <input value={form.height} onChange={e => update('height', parseFloat(e.target.value) || 0)} type="number" min={0} placeholder="Height"
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white placeholder-gray-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <MapPin className="h-4 w-4 text-purple-500" /> Routing
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Origin Station</label>
              <select value={form.originStationId} onChange={e => update('originStationId', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white">
                <option value="">Select origin...</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.code} - {s.city}, {s.country}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Destination Station</label>
              <select value={form.destinationStationId} onChange={e => update('destinationStationId', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white">
                <option value="">Select destination...</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.code} - {s.city}, {s.country}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit Quote Request <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
