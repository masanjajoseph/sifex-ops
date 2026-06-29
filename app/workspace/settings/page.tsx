'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Save, RefreshCw, Plus, Pencil, Trash2, DollarSign, Plane, X, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Station {
  id: string;
  code: string;
  name: string;
}

interface ExchangeRate {
  id: string;
  baseCurrency: string;
  rates: Record<string, number>;
  source: string;
  validAt: string;
}

interface FreightRate {
  id?: string;
  shipmentType: string;
  ratePerKg: number;
  currency: string;
  isActive: boolean;
}

const emptyFreightRate = (): FreightRate => ({
  shipmentType: '',
  ratePerKg: 0,
  currency: 'USD',
  isActive: true,
});

export default function SettingsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [awbTypes, setAwbTypes] = useState<{ code: string; name: string; label: string }[]>([]);
  const [currencies, setCurrencies] = useState<{ code: string; name: string; symbol: string }[]>([]);
  const [settings, setSettings] = useState({
    companyName: '',
    companyCode: '',
    defaultCurrency: 'USD',
    defaultChargeableDivisor: '6000',
    trackingPrefix: '',
    autoGenerateTracking: true,
  });

  const [exCurrency, setExCurrency] = useState('TZS');
  const [exRate, setExRate] = useState(0);
  const [exExchangeRate, setExExchangeRate] = useState(0);
  const [exSource, setExSource] = useState('manual');
  const [exSaved, setExSaved] = useState(false);

  const [freightRates, setFreightRates] = useState<FreightRate[]>([]);
  const [showFrForm, setShowFrForm] = useState(false);
  const [editingFr, setEditingFr] = useState<string | undefined>(undefined);
  const [frForm, setFrForm] = useState<FreightRate>(emptyFreightRate());
  const [frSaving, setFrSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        const s = json.data;
        if (s) {
          setSettings({
            companyName: s.companyName || '',
            companyCode: s.companyCode || '',
            defaultCurrency: s.defaultCurrency || 'USD',
            defaultChargeableDivisor: String(s.defaultChargeableDivisor || '6000'),
            trackingPrefix: s.trackingPrefix || '',
            autoGenerateTracking: s.autoGenerateTracking ?? true,
          });
        }
      }
    } catch {}
  }, []);

  const loadStations = useCallback(async () => {
    try {
      const res = await fetch('/api/stations');
      if (res.ok) {
        const json = await res.json();
        setStations(json.data || []);
      }
    } catch {}
  }, []);

  const loadFreightRates = useCallback(async () => {
    try {
      const res = await fetch('/api/freight-rates?isActive=true');
      if (!res.ok) return;
      const json = await res.json();
      setFreightRates(json.data || []);
    } catch {}
  }, []);

  const loadAWBTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/awb-types');
      if (res.ok) { const j = await res.json(); setAwbTypes(j.data || []); }
    } catch {}
  }, []);

  const loadCurrencies = useCallback(async () => {
    try {
      const res = await fetch('/api/currencies');
      if (res.ok) { const j = await res.json(); setCurrencies(j.data || []); }
    } catch {}
  }, []);

  const loadExchangeRates = useCallback(async () => {
    try {
      const res = await fetch('/api/exchange-rates');
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data?.rates) {
        const rates = json.data.rates;
        setExCurrency(rates.currency || 'TZS');
        setExRate(rates.rate || 0);
        setExExchangeRate(rates.exchangeRate || 0);
        setExSource(json.data.source || 'manual');
      }
    } catch {}
  }, []);

  useEffect(() => { loadSettings(); loadStations(); loadFreightRates(); loadExchangeRates(); loadAWBTypes(); loadCurrencies(); }, [loadSettings, loadStations, loadFreightRates, loadExchangeRates, loadAWBTypes, loadCurrencies]);

  const handleSaveExchangeRates = async () => {
    setExSaved(false);
    try {
      const res = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseCurrency: 'USD',
          rates: { currency: exCurrency, rate: exRate, exchangeRate: exExchangeRate },
          source: exSource,
        }),
      });
      if (res.ok) {
        setExSaved(true);
        setTimeout(() => setExSaved(false), 3000);
      }
    } catch {}
  };

  const handleFrSave = async () => {
    setFrSaving(true);
    try {
      const body = {
        shipmentType: frForm.shipmentType,
        ratePerKg: frForm.ratePerKg,
        currency: frForm.currency,
        isActive: frForm.isActive,
      };

      if (editingFr) {
        await fetch(`/api/freight-rates/${editingFr}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/freight-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      setShowFrForm(false);
      setEditingFr(undefined);
      setFrForm(emptyFreightRate());
      loadFreightRates();
    } catch {}
    setFrSaving(false);
  };

  const handleFrEdit = (rate: FreightRate) => {
    if (!rate.id) return;
    setFrForm({
      shipmentType: rate.shipmentType,
      ratePerKg: rate.ratePerKg,
      currency: rate.currency,
      isActive: rate.isActive,
    });
    setEditingFr(rate.id);
    setShowFrForm(true);
  };

  const handleFrDelete = async (id: string | undefined) => {
    if (!id) return;
    try {
      await fetch(`/api/freight-rates/${id}`, { method: 'DELETE' });
      loadFreightRates();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description="Configure system preferences and operational defaults"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Settings' }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Company Information</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Company Name</Label>
              <Input value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Company Code</Label>
              <Input value={settings.companyCode} onChange={(e) => setSettings({ ...settings, companyCode: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tracking Prefix</Label>
              <Input value={settings.trackingPrefix} onChange={(e) => setSettings({ ...settings, trackingPrefix: e.target.value })} />
              <p className="text-xs text-gray-400">Used for auto-generated tracking numbers (e.g., SFX-MAWB-DAR-20260526-0001)</p>
            </div>
          </div>
        </div>

        {/* Operational Defaults */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Operational Defaults</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Default Currency</Label>
              <select
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Chargeable Weight Divisor</Label>
              <Input
                type="number"
                value={settings.defaultChargeableDivisor}
                onChange={(e) => setSettings({ ...settings, defaultChargeableDivisor: e.target.value })}
              />
              <p className="text-xs text-gray-400">Standard IATA divisor for volumetric weight calculation (default: 6000)</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoTracking"
                checked={settings.autoGenerateTracking}
                onChange={(e) => setSettings({ ...settings, autoGenerateTracking: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <Label htmlFor="autoTracking" className="text-xs font-medium">
                Auto-generate tracking numbers on cargo acceptance
              </Label>
            </div>
          </div>
        </div>

        {/* Stations */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Active Stations</h3>
          <div className="flex flex-wrap gap-2">
            {stations.length === 0 ? (
              <p className="text-sm text-gray-400">No stations configured</p>
            ) : (
              stations.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  <span className="text-gray-700 dark:text-gray-300">{s.code} - {s.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Document Numbering */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Document Numbering</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">MAWB Prefix</Label>
              <Input defaultValue="SFX-MAWB" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">HAWB Prefix</Label>
              <Input defaultValue="SFX-HAWB" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tracking Prefix</Label>
              <Input defaultValue="SFXTRK" />
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Rate */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <DollarSign className="h-4 w-4 text-green-500" />
            Exchange Rate
          </h3>
          <div className="flex items-center gap-2">
            {exSaved && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" /> Saved</span>}
            <Button variant="outline" size="sm" onClick={loadExchangeRates}><RefreshCw className="mr-1 h-3 w-3" /> Refresh</Button>
            <Button size="sm" onClick={handleSaveExchangeRates}><Save className="mr-1 h-3 w-3" /> Save</Button>
          </div>
        </div>
        <div className="grid max-w-lg gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Rate (USD)</Label>
            <Input type="number" step="any" min="0" value={exRate || ''} onChange={e => setExRate(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Currency</Label>
            <select value={exCurrency} onChange={e => setExCurrency(e.target.value)} className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
              {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Exchange Rate (1 USD = ?)</Label>
            <Input type="number" step="any" min="0" value={exExchangeRate || ''} onChange={e => setExExchangeRate(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">Rate: {exRate} USD | 1 USD = {exExchangeRate} {exCurrency}</p>
      </div>

      {/* Freight Rate Management */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Plane className="h-4 w-4 text-blue-500" />
            Freight Rates
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadFreightRates}>
              <RefreshCw className="mr-1 h-3 w-3" /> Refresh
            </Button>
            <Button size="sm" onClick={() => { setFrForm(emptyFreightRate()); setEditingFr(undefined); setShowFrForm(true); }}>
              <Plus className="mr-1 h-3 w-3" /> Add Rate
            </Button>
          </div>
        </div>

        {showFrForm && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                {editingFr !== undefined ? 'Edit Freight Rate' : 'New Freight Rate'}
              </h4>
              <button onClick={() => { setShowFrForm(false); setEditingFr(undefined); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">AWB Type</Label>
                <select
                  value={frForm.shipmentType}
                  onChange={(e) => setFrForm({ ...frForm, shipmentType: e.target.value })}
                  className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Select type</option>
                  {awbTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Freight Rate</Label>
                <Input type="number" min="0" step="any" value={frForm.ratePerKg || ''} onChange={(e) => setFrForm({ ...frForm, ratePerKg: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700">
                  <input type="checkbox" checked={frForm.isActive} onChange={(e) => setFrForm({ ...frForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  Active
                </label>
                <Button size="sm" onClick={handleFrSave} disabled={frSaving || !frForm.shipmentType}>
                  {frSaving ? 'Saving...' : editingFr ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700">
                <th className="pb-2 pr-4 font-medium">AWB Type</th>
                <th className="pb-2 pr-4 font-medium">Freight Rate</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {freightRates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">No freight rates configured yet</td>
                </tr>
              ) : (
                freightRates.map((rate) => (
                  <tr key={rate.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4">{awbTypes.find((t) => t.code === rate.shipmentType)?.label || rate.shipmentType}</td>
                    <td className="py-2 pr-4 font-medium">{rate.ratePerKg}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${rate.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleFrEdit(rate)} className="rounded p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleFrDelete(rate.id)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
