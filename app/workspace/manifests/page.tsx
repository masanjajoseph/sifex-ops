'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet, RefreshCw, Plus, Upload, Loader2, AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ManifestItem {
  id: string;
  manifestNumber: string;
  manifestType: string;
  flightId: string;
  status: string;
  totalPieces: number;
  totalWeight: number;
  createdAt: string;
}

interface ManifestRow {
  awbNumber: string;
  pieces: string;
  weight: string;
}

interface ReconcileRow {
  awbNumber: string;
  status: 'MATCH' | 'PIECES_MISMATCH' | 'WEIGHT_MISMATCH' | 'MULTIPLE_MISMATCH' | 'MISSING_IN_SYSTEM' | 'DUPLICATE';
  message: string;
  uploadedPieces: number | null;
  uploadedWeight: number | null;
  systemPieces: number | null;
  systemWeight: number | null;
  systemAwbNumber?: string;
  workflowStatus?: string;
  destination?: string | null;
}

interface ReconcileResult {
  summary: {
    total: number;
    matched: number;
    discrepancies: number;
    missingInSystem: number;
    duplicates: number;
  };
  rows: ReconcileRow[];
  reconciledAt: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'LOADED': case 'DEPARTED': return 'info' as const;
    case 'CONFIRMED': return 'success' as const;
    case 'CREATED': return 'pending' as const;
    default: return 'pending' as const;
  }
};

const reconcileStatus = (s: ReconcileRow['status']) => {
  switch (s) {
    case 'MATCH': return { label: 'Match', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    case 'PIECES_MISMATCH': return { label: 'Pieces differ', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'WEIGHT_MISMATCH': return { label: 'Weight differs', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'MULTIPLE_MISMATCH': return { label: 'Multiple differences', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    case 'MISSING_IN_SYSTEM': return { label: 'Not in SIFEX', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    case 'DUPLICATE': return { label: 'Duplicate row', className: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' };
    default: return { label: s, className: 'bg-gray-100 text-gray-600' };
  }
};

/** Parse CSV / TSV / semicolon-delimited manifest text with optional header row. */
function parseDelimited(text: string): ManifestRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';

  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim().replace(/^"|"$/g, ''));
  };

  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const findCol = (...names: string[]) =>
    header.findIndex((h) => names.some((n) => h === n || h.includes(n)));

  let awbIdx = findCol('awb', 'air waybill', 'waybill');
  let piecesIdx = findCol('pieces', 'pcs', 'piece');
  let weightIdx = findCol('weight', 'kg', 'gross');
  const hasHeader = awbIdx >= 0;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  if (!hasHeader) {
    awbIdx = 0;
    piecesIdx = 1;
    weightIdx = 2;
  }

  return dataLines
    .map((line) => {
      const cols = splitLine(line);
      return {
        awbNumber: (cols[awbIdx] || '').trim(),
        pieces: piecesIdx >= 0 ? (cols[piecesIdx] || '').trim() : '',
        weight: weightIdx >= 0 ? (cols[weightIdx] || '').trim() : '',
      };
    })
    .filter((r) => r.awbNumber.length > 0 && !/^awb/i.test(r.awbNumber));
}

export default function ManifestsPage() {
  const [data, setData] = useState<ManifestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [fileName, setFileName] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [reconcileError, setReconcileError] = useState('');
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manifests?limit=50', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const rows = useMemo(() => parseDelimited(uploadText), [uploadText]);

  const stats = useMemo(() => ({
    total: data.length,
    totalItems: data.reduce((a, m) => a + m.totalPieces, 0),
    loaded: data.filter((m) => m.status === 'LOADED').length,
  }), [data]);

  const openUpload = () => {
    setUploadOpen(true);
    setUploadText('');
    setFileName('');
    setResult(null);
    setReconcileError('');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setReconcileError('');

    if (/\.(xlsx?|pdf)$/i.test(file.name)) {
      setFileName(file.name);
      setUploadText('');
      setReconcileError('Excel and PDF manifests cannot be read directly. Export the manifest as CSV and upload it, or paste the rows below.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setUploadText(String(reader.result || ''));
    reader.onerror = () => setReconcileError('Could not read that file.');
    reader.readAsText(file);
  };

  const handleReconcile = async () => {
    if (rows.length === 0 || reconciling) return;
    setReconciling(true);
    setReconcileError('');
    try {
      const res = await fetch('/api/manifests/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, fileName: fileName || 'pasted-manifest' }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReconcileError(j.error || 'Reconciliation failed');
        return;
      }
      setResult(j.data);
    } catch {
      setReconcileError('Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargo Manifests"
        description="Create manifests and reconcile airline or ground-handler manifest files"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Manifests' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={openUpload}>
              <Upload className="mr-1 h-4 w-4" /> Upload Manifest
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Manifest
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Manifests" value={stats.total} icon={<FileSpreadsheet className="h-5 w-5" />} />
        <StatCard label="Total Items" value={stats.totalItems} icon={<FileSpreadsheet className="h-5 w-5" />} />
        <StatCard label="Loaded Today" value={stats.loaded} icon={<FileSpreadsheet className="h-5 w-5" />} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet className="h-12 w-12" />}
          title="No manifests yet"
          description="Create a manifest to consolidate shipments for a flight."
          action={<Button onClick={openUpload}><Upload className="mr-1 h-4 w-4" /> Reconcile Manifest</Button>}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">All Manifests</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.manifestNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.manifestType} · {m.totalPieces} items · {m.totalWeight} kg</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                  <StatusBadge status={statusVariant(m.status)} label={m.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={(v) => { if (!v && !reconciling) setUploadOpen(false); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manifest Reconciliation</DialogTitle>
            <DialogDescription>
              Upload the airline or ground-handler manifest (CSV / TSV / TXT) or paste its rows. The report compares pieces and weight with the shipments already recorded in SIFEX. Nothing is changed automatically.
            </DialogDescription>
          </DialogHeader>

          {reconcileError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{reconcileError}</span>
            </div>
          )}

          {!result ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                >
                  <Upload className="h-6 w-6" />
                  <span>{fileName || 'Choose manifest file'}</span>
                  <span className="text-[11px] text-gray-400">CSV, TSV or TXT</span>
                </button>
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500 dark:bg-gray-800/50">
                  <p className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Expected columns</p>
                  <p>AWB number · Pieces · Weight</p>
                  <p className="mt-1">A header row is detected automatically. Without a header, columns must be in that order.</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Or paste manifest rows</label>
                <textarea
                  value={uploadText}
                  onChange={(e) => { setUploadText(e.target.value); setResult(null); }}
                  rows={5}
                  className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder={'AWB,Pieces,Weight\n020-12345678,3,45.5\n020-87654321,1,12.0'}
                />
              </div>

              {rows.length > 0 && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5 text-xs dark:border-gray-800">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{rows.length} row(s) detected</span>
                    <span className="text-gray-400">Showing first 10</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-800/60">
                        <tr>
                          <th className="px-3 py-1 font-medium">AWB</th>
                          <th className="px-3 py-1 font-medium">Pieces</th>
                          <th className="px-3 py-1 font-medium">Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {rows.slice(0, 10).map((r, i) => (
                          <tr key={`${r.awbNumber}-${i}`}>
                            <td className="px-3 py-1 font-mono text-gray-900 dark:text-white">{r.awbNumber}</td>
                            <td className="px-3 py-1 text-gray-600 dark:text-gray-300">{r.pieces || '—'}</td>
                            <td className="px-3 py-1 text-gray-600 dark:text-gray-300">{r.weight || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)} disabled={reconciling}>Cancel</Button>
                <Button
                  size="sm"
                  className="bg-[#d00020] text-white hover:bg-[#d00020]/90"
                  onClick={handleReconcile}
                  disabled={rows.length === 0 || reconciling}
                >
                  {reconciling ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ClipboardCheck className="mr-1 h-3 w-3" />}
                  {reconciling ? 'Reconciling...' : `Reconcile ${rows.length || ''} Row${rows.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Rows</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{result.summary.total}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900/40 dark:bg-green-900/20">
                  <p className="text-[10px] uppercase tracking-wide text-green-600 dark:text-green-400">Matched</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">{result.summary.matched}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-900/20">
                  <p className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">Discrepancies</p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{result.summary.discrepancies}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20">
                  <p className="text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400">Not in SIFEX</p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-300">{result.summary.missingInSystem}</p>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-left text-gray-500 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">AWB</th>
                      <th className="px-3 py-1.5 font-medium">Uploaded</th>
                      <th className="px-3 py-1.5 font-medium">SIFEX</th>
                      <th className="px-3 py-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {result.rows.map((r, i) => {
                      const badge = reconcileStatus(r.status);
                      return (
                        <tr key={`${r.awbNumber}-${i}`}>
                          <td className="px-3 py-1.5 font-mono text-gray-900 dark:text-white">{r.awbNumber}</td>
                          <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">
                            {r.uploadedPieces ?? '—'} pcs · {r.uploadedWeight ?? '—'} kg
                          </td>
                          <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">
                            {r.systemPieces ?? '—'} pcs · {r.systemWeight ?? '—'} kg
                          </td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setResult(null); setUploadText(''); setFileName(''); }}>
                  <RefreshCw className="mr-1 h-3 w-3" /> Reconcile Another
                </Button>
                <Button size="sm" onClick={() => setUploadOpen(false)}>Done</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
