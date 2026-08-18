'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, RefreshCw, Search, CheckCircle, AlertCircle,
  Loader2, ArrowRight, Building, User
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';

interface HouseAWB {
  id: string;
  houseAWBNumber: string;
  trackingNumber: string;
  pieces: number;
  weight: number;
  volume: number;
  description: string | null;
  shipper: { name: string } | null;
  receiver: { name: string } | null;
  createdAt: string;
}

interface MasterAWB {
  id: string;
  awbNumber: string;
  trackingNumber: string;
}

export default function HawbLoadingPage() {
  const router = useRouter();
  const [hawbs, setHawbs] = useState<HouseAWB[]>([]);
  const [mawbs, setMawbs] = useState<MasterAWB[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedMawbId, setSelectedMawbId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const [hawbRes, mawbRes] = await Promise.all([
        fetch(`/api/hawb-loading?${params}`),
        fetch('/api/master-awbs?scope=export&status=HAWB_GENERATED&limit=100'),
      ]);
      if (hawbRes.ok) { const j = await hawbRes.json(); setHawbs(j.data || []); }
      if (mawbRes.ok) { const j = await mawbRes.json(); setMawbs(j.data || []); }
    } catch { setHawbs([]); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === hawbs.length) setSelected(new Set());
    else setSelected(new Set(hawbs.map(h => h.id)));
  };

  const handleAssign = async () => {
    if (selected.size === 0 || !selectedMawbId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/hawb-loading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hawbIds: Array.from(selected), masterAWBId: selectedMawbId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Assignment failed'); return; }
      setSuccess(`${selected.size} HAWB(s) assigned successfully`);
      setSelected(new Set());
      fetchData();
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="HAWB Loading"
        description="Assign unassigned House AWBs to Master AWBs for consolidation"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'HAWB Loading' }]}
        action={
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search HAWB number..."
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedMawbId} onChange={e => setSelectedMawbId(e.target.value)}
              className="flex h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Select destination MAWB...</option>
              {mawbs.map(m => (
                <option key={m.id} value={m.id}>{m.awbNumber} - {m.trackingNumber}</option>
              ))}
            </select>
            <Button size="sm" onClick={handleAssign} disabled={selected.size === 0 || !selectedMawbId || submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-1 h-4 w-4" />}
              Assign {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-sm text-red-600 dark:border-gray-800 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-sm text-green-600 dark:border-gray-800 dark:text-green-400">
            <CheckCircle className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : hawbs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Package className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">No unassigned HAWBs</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">All HAWBs are assigned to a MAWB</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input type="checkbox" checked={selected.size === hawbs.length && hawbs.length > 0} onChange={toggleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600" />
                Select All ({hawbs.length})
              </label>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-400">{selected.size} selected</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {hawbs.map(hawb => (
                <div key={hawb.id}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selected.has(hawb.id) ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                  onClick={() => toggleSelect(hawb.id)}
                >
                  <input type="checkbox" checked={selected.has(hawb.id)} onChange={() => toggleSelect(hawb.id)}
                    className="rounded border-gray-300 dark:border-gray-600" />
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{hawb.houseAWBNumber}</span>
                      <span className="text-xs text-gray-400">#{hawb.trackingNumber}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                      {hawb.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{hawb.pieces} pcs</span>
                    <span>{hawb.weight} kg</span>
                    <span className="hidden sm:inline">{hawb.volume} m³</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
