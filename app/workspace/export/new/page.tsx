'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plane, Package, Weight, DollarSign, X, Plus, ChevronDown, ChevronRight, Ship, UserSquare2, CheckCircle2, AlertCircle, Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/TimePicker';
import { cn } from '@/lib/utils';
interface SenderReceiver {
  name: string; company: string; phone: string; address: string; city: string; country: string;
}

interface ParcelItem {
  description: string; quantity: number; weight: number; length: number; width: number; height: number;
}

interface HAWBEntry {
  id: string;
  sender: SenderReceiver;
  receiver: SenderReceiver;
  description: string;
  paymentMode: 'PP' | 'CC'; currency: string; customsValue: string;
  insurance: string; terms: string; orderNumber: string; awbType: string;
  dateReceived: string; expectedArrivalDate: string;
  parcels: ParcelItem[];
  chargeableWeight: number; freightRate: number; freightAmount: number;
}

const emptySR = (): SenderReceiver => ({ name: '', company: '', phone: '', address: '', city: '', country: '' });

const createHawb = (): HAWBEntry => ({
  id: Math.random().toString(36).slice(2),
  sender: emptySR(), receiver: emptySR(),
  description: '',
  paymentMode: 'PP', currency: 'USD', customsValue: '',
  insurance: '', terms: '', orderNumber: '', awbType: '',
  dateReceived: '', expectedArrivalDate: '',
  parcels: [{ description: '', quantity: 1, weight: 0, length: 0, width: 0, height: 0 }],
  chargeableWeight: 0, freightRate: 0, freightAmount: 0,
});

const DRAFT_KEY = 'sifex_new_export_draft';

const calcVw = (l: number, w: number, h: number) => Math.round((l * w * h) / 6000);

const emptySr = (): SenderReceiver => ({ name: '', company: '', phone: '', address: '', city: '', country: '' });

export default function NewExportPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [airlineId, setAirlineId] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [originStation, setOriginStation] = useState('');
  const [destinationStation, setDestinationStation] = useState('');
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().slice(0, 10));
  const [departureTime, setDepartureTime] = useState('12:00');
  const [hawbs, setHawbs] = useState<HAWBEntry[]>([createHawb()]);
  const [expandedHawb, setExpandedHawb] = useState(hawbs[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState('');
  const [stations, setStations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [awbTypes, setAwbTypes] = useState<{ code: string; name: string; label: string }[]>([]);
  const [airlines, setAirlines] = useState<{ id: string; iataCode: string; name: string }[]>([]);

  const [resumeDraft, setResumeDraft] = useState(false);
  const [saving, setSaving] = useState<'saving' | 'saved' | null>(null);
  const hasUserData = useRef(false);

  useEffect(() => {
    fetch('/api/stations').then(r => r.ok && r.json()).then(j => setStations(j?.data || [])).catch(() => {});
    fetch('/api/awb-types').then(r => r.ok && r.json()).then(j => setAwbTypes(j?.data || [])).catch(() => {});
    fetch('/api/airlines').then(r => r.ok && r.json()).then(j => setAirlines(j?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hawbs?.length > 0 && parsed.hawbs.some((h: HAWBEntry) => h.sender.name || h.receiver.name)) {
          setResumeDraft(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (resumeDraft) return;
    if (!hasUserData.current) {
      const hasData = originStation || destinationStation || flightNumber || airlineId ||
        hawbs.some(h => h.sender.name || h.receiver.name || h.description || h.parcels.some(p => p.description));
      if (!hasData) return;
      hasUserData.current = true;
    }
    setSaving('saving');
    const timer = setTimeout(() => {
      try {
        const draft = { step, airlineId, flightNumber, originStation, destinationStation, hawbs, expandedHawb, departureDate, departureTime };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {}
      setSaving('saved');
    }, 800);
    return () => clearTimeout(timer);
  }, [step, airlineId, flightNumber, originStation, destinationStation, hawbs, expandedHawb, departureDate, departureTime, resumeDraft]);

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStep(parsed.step ?? 0);
        setAirlineId(parsed.airlineId ?? '');
        setFlightNumber(parsed.flightNumber ?? '');
        setOriginStation(parsed.originStation ?? '');
        setDestinationStation(parsed.destinationStation ?? '');
        setDepartureDate(parsed.departureDate ?? new Date().toISOString().slice(0, 10));
        setDepartureTime(parsed.departureTime ?? '12:00');
        setHawbs(parsed.hawbs ?? [createHawb()]);
        setExpandedHawb(parsed.expandedHawb ?? parsed.hawbs?.[0]?.id ?? '');
      }
    } catch {}
    setResumeDraft(false);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setResumeDraft(false);
  };

  const steps = ['Flight Info', 'House AWBs', 'Review'];

  const updateSender = (id: string, field: keyof SenderReceiver, value: string) => {
    setHawbs(prev => prev.map(h => h.id === id ? { ...h, sender: { ...h.sender, [field]: value } } : h));
  };
  const updateReceiver = (id: string, field: keyof SenderReceiver, value: string) => {
    setHawbs(prev => prev.map(h => h.id === id ? { ...h, receiver: { ...h.receiver, [field]: value } } : h));
  };
  const updateHawb = (id: string, field: keyof HAWBEntry, value: unknown) => {
    setHawbs(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const handleAwbTypeChange = (hawbId: string, awbType: string) => {
    setHawbs(prev => prev.map(h => h.id === hawbId ? { ...h, awbType } : h));
    if (!awbType) return;
    fetch(`/api/freight-rates?shipmentType=${encodeURIComponent(awbType)}&isActive=true`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        const rates = json.data || json;
        if (rates.length > 0) {
          const fr = rates[0];
          const rate = parseFloat(fr.ratePerKg) || 0;
          setHawbs(prev => prev.map(h => h.id === hawbId ? {
            ...h,
            freightRate: rate,
            freightAmount: rate * h.chargeableWeight,
            currency: fr.currency || 'USD',
          } : h));
        }
      })
      .catch(() => {});
  };

  const updateParcel = (hawbId: string, idx: number, field: keyof ParcelItem, value: number | string) => {
    setHawbs(prev => prev.map(h => {
      if (h.id !== hawbId) return h;
      const parcels = [...h.parcels];
      parcels[idx] = { ...parcels[idx], [field]: value };
      const l = field === 'length' ? Number(value) : parcels[idx].length;
      const w = field === 'width' ? Number(value) : parcels[idx].width;
      const ht = field === 'height' ? Number(value) : parcels[idx].height;
      parcels[idx] = { ...parcels[idx] };
      const totalW = parcels.reduce((s, p) => s + Number(p.weight), 0);
      const totalVw = parcels.reduce((s, p) => s + calcVw(p.length, p.width, p.height), 0);
      const cw = Math.max(totalW, totalVw);
      return { ...h, parcels, chargeableWeight: cw, freightAmount: cw * h.freightRate };
    }));
  };

  const addParcel = (hawbId: string) => {
    setHawbs(prev => prev.map(h => h.id === hawbId ? { ...h, parcels: [...h.parcels, { description: '', quantity: 1, weight: 0, length: 0, width: 0, height: 0 }] } : h));
  };
  const removeParcel = (hawbId: string, idx: number) => {
    setHawbs(prev => prev.map(h => {
      if (h.id !== hawbId || h.parcels.length <= 1) return h;
      const parcels = h.parcels.filter((_, i) => i !== idx);
      const totalW = parcels.reduce((s, p) => s + Number(p.weight), 0);
      const totalVw = parcels.reduce((s, p) => s + calcVw(p.length, p.width, p.height), 0);
      return { ...h, parcels, chargeableWeight: Math.max(totalW, totalVw), freightAmount: h.freightRate * Math.max(totalW, totalVw) };
    }));
  };
  const addHawb = () => { const h = createHawb(); setHawbs(prev => [...prev, h]); setExpandedHawb(h.id); };
  const removeHawb = (id: string) => {
    if (hawbs.length <= 1) return;
    setHawbs(prev => prev.filter(h => h.id !== id));
    if (expandedHawb === id) setExpandedHawb(hawbs[0].id === id ? hawbs[1]?.id : hawbs[0].id);
  };

  const canProceed = () => {
    if (step === 0) return originStation && destinationStation && flightNumber && departureDate;
    if (step === 1) return hawbs.some(h => h.sender.name && h.receiver.name && h.description && h.parcels.some(p => p.description && p.weight > 0));
    return originStation && destinationStation && flightNumber && departureDate && hawbs.some(h => h.sender.name);
  };

  const renderField = (label: string, value: string | number, onChange: (v: string) => void, opts?: { type?: string; placeholder?: string; required?: boolean; className?: string }) => (
    <div className={cn('space-y-1', opts?.className)}>
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}{opts?.required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      <Input type={opts?.type || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={opts?.placeholder} className="h-8 text-sm" step={opts?.type === 'number' ? 'any' : undefined} />
    </div>
  );

  const handleSubmit = async () => {
    setSubmitting(true); setError('');

    if (!originStation || !destinationStation) {
      setError('Please select both origin and destination stations.');
      setSubmitting(false);
      return;
    }

    try {
      const mawbRes = await fetch('/api/master-awbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awbNumber: `MAWB-${Date.now()}`,
          originStationId: originStation,
          destinationStationId: destinationStation,
          airlineId,
          flightNumber,
          departureTime: `${departureDate}T${departureTime}:00`,
          arrivalTime: undefined,
          senderName: 'Sifex Logistics',
          senderAddress: '',
          shipmentType: hawbs.find(h => h.awbType)?.awbType || 'CAN_GUANGZHOU',
          paymentMode: 'PP', currency: 'USD',
        }),
      });
      if (!mawbRes.ok) {
        const errBody = await mawbRes.json().catch(() => null);
        throw new Error(errBody?.error || `Master AWB creation failed (HTTP ${mawbRes.status})`);
      }
      const mawbData = await mawbRes.json();
      const masterAWBId = mawbData.data?.id || mawbData.id;

      for (const hawb of hawbs) {
        if (!hawb.sender.name) continue;
        const [shipperRes, receiverRes] = await Promise.all([
          fetch('/api/customers', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: hawb.sender.name, code: `SHP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: 'COMPANY', phone: hawb.sender.phone, address: hawb.sender.address, city: hawb.sender.city, country: hawb.sender.country }),
          }),
          fetch('/api/customers', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: hawb.receiver.name, code: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: 'COMPANY', phone: hawb.receiver.phone, address: hawb.receiver.address, city: hawb.receiver.city, country: hawb.receiver.country }),
          }),
        ]);
        if (!shipperRes.ok || !receiverRes.ok) throw new Error('Failed to create customers');
        const [shipperData, receiverData] = await Promise.all([shipperRes.json(), receiverRes.json()]);
        const shipperId = shipperData.data?.id || shipperData.id;
        const receiverId = receiverData.data?.id || receiverData.id;

        const totalVolume = hawb.parcels.reduce((s, p) => s + (p.length * p.width * p.height) * p.quantity, 0);
        const volumeWeight = Math.round(totalVolume / 6000);

        const hawbRes = await fetch('/api/house-awbs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            houseAWBNumber: `HAWB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            masterAWBId, shipperId, receiverId,
            pieces: hawb.parcels.reduce((s, p) => s + p.quantity, 0),
            weight: hawb.parcels.reduce((s, p) => s + p.weight, 0),
            volume: totalVolume,
            volumeWeight,
            chargeableWeight: hawb.chargeableWeight,
            freight: hawb.freightAmount, freightRate: hawb.freightRate,
            insurance: Number(hawb.insurance) || 0,

            currency: hawb.currency, customsValue: Number(hawb.customsValue) || 0,
            shipmentType: hawb.awbType || undefined,
          }),
        });
        if (!hawbRes.ok) {
          const errBody = await hawbRes.json().catch(() => null);
          throw new Error(errBody?.error || `House AWB creation failed (HTTP ${hawbRes.status})`);
        }
        const hawbData = await hawbRes.json();
        const houseAWBId = hawbData.data?.id || hawbData.id;

        for (const parcel of hawb.parcels) {
          if (!parcel.description) continue;
          const parRes = await fetch('/api/parcels', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              houseAWBId, parcelTrackingNumber: `PK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              barcode: `BAR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              description: parcel.description, quantity: parcel.quantity,
              actualWeight: parcel.weight, length: parcel.length, width: parcel.width, height: parcel.height,
              packageType: 'CTN',
            }),
          });
          if (!parRes.ok) throw new Error('Failed to create parcel');
        }
      }

      clearDraft();
      setSuccess(true);
      setCreatedId(masterAWBId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment');
    } finally { setSubmitting(false); }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export Created Successfully</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Master AWB has been created.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => router.push('/workspace/export')}>Back to Exports</Button>
          <Button onClick={() => router.push(`/workspace/export/${createdId}`)}>View Shipment</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="New Export Shipment"
        description="Create a new Master AWB with House AWBs under consolidation"
        breadcrumbs={[
          { label: 'Workspace', href: '/workspace' },
          { label: 'Export Operations', href: '/workspace/export' },
          { label: 'New Export' },
        ]}
        action={
          <Button variant="outline" size="sm" onClick={() => router.push('/workspace/export')}>
            Cancel
          </Button>
        }
      />

      {resumeDraft && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Package className="h-4 w-4 shrink-0" />
            <span>Unsaved draft found — resume where you left off?</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearDraft}>
              <Trash2 className="mr-1 h-3 w-3" /> Discard
            </Button>
            <Button size="sm" onClick={loadDraft}>
              Resume Draft
            </Button>
          </div>
        </div>
      )}

      {saving && !resumeDraft && (
        <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          {saving === 'saving' ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              Saving to draft...
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Draft saved
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto py-2">
        {steps.map((s, i) => {
          const canVisit = i <= step || (i === step + 1 && canProceed());
          return (
            <div key={s} className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canVisit}
                onClick={() => canVisit && setStep(i)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                  !canVisit && 'cursor-not-allowed opacity-50',
                  step === i ? 'bg-blue-600 text-white' : i < step ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                )}
              >
                {i < step ? '\u2713' : i + 1} {s}
              </button>
              {i < steps.length - 1 && <div className={cn('h-px w-4', i < step ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700')} />}
            </div>
          );
        })}
      </div>

      {step === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Plane className="h-4 w-4 text-blue-500" /> Flight & Route Information
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Airline</Label>
              <select
                value={airlineId}
                onChange={e => setAirlineId(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">Select airline</option>
                {airlines.map(a => <option key={a.id} value={a.iataCode}>{a.iataCode} - {a.name}</option>)}
              </select>
            </div>
            {renderField('Flight Number', flightNumber, setFlightNumber, { required: true, placeholder: 'e.g. KQ-482' })}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Origin Station <span className="ml-0.5 text-red-500">*</span></Label>
              <select
                value={originStation}
                onChange={e => setOriginStation(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">Select origin</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Destination Station <span className="ml-0.5 text-red-500">*</span></Label>
              <select
                value={destinationStation}
                onChange={e => setDestinationStation(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">Select destination</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Departure Date <span className="ml-0.5 text-red-500">*</span></Label>
              <DatePicker value={departureDate} onChange={setDepartureDate} placeholder="Select departure date" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Departure Time</Label>
              <TimePicker value={departureTime} onChange={setDepartureTime} />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <UserSquare2 className="h-4 w-4 text-blue-500" /> House Air Waybills
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={addHawb}>
              <Plus className="mr-1 h-3 w-3" /> Add HAWB
            </Button>
          </div>

          {hawbs.map((hawb) => (
            <div key={hawb.id} className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div
                onClick={() => setExpandedHawb(expandedHawb === hawb.id ? '' : hawb.id)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  {expandedHawb === hawb.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {hawb.sender.name || `House AWB #${hawbs.indexOf(hawb) + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hawb.freightAmount > 0 && <span className="text-xs font-medium text-green-600 dark:text-green-400">${hawb.freightAmount.toFixed(2)}</span>}
                  {hawbs.length > 1 && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeHawb(hawb.id); }} className="text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {expandedHawb === hawb.id && (
                <div className="space-y-4 border-t border-gray-100 px-4 py-4 dark:border-gray-800">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Shipper (Sender)</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {renderField('Name', hawb.sender.name, v => updateSender(hawb.id, 'name', v), { required: true })}
                        {renderField('Company', hawb.sender.company, v => updateSender(hawb.id, 'company', v))}
                        {renderField('Phone', hawb.sender.phone, v => updateSender(hawb.id, 'phone', v))}
                        {renderField('Address', hawb.sender.address, v => updateSender(hawb.id, 'address', v))}
                        {renderField('City', hawb.sender.city, v => updateSender(hawb.id, 'city', v))}
                        {renderField('Country', hawb.sender.country, v => updateSender(hawb.id, 'country', v))}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Consignee (Receiver)</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {renderField('Name', hawb.receiver.name, v => updateReceiver(hawb.id, 'name', v), { required: true })}
                        {renderField('Company', hawb.receiver.company, v => updateReceiver(hawb.id, 'company', v))}
                        {renderField('Phone', hawb.receiver.phone, v => updateReceiver(hawb.id, 'phone', v))}
                        {renderField('Address', hawb.receiver.address, v => updateReceiver(hawb.id, 'address', v))}
                        {renderField('City', hawb.receiver.city, v => updateReceiver(hawb.id, 'city', v))}
                        {renderField('Country', hawb.receiver.country, v => updateReceiver(hawb.id, 'country', v))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Shipment Details</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {renderField('Description', hawb.description, v => updateHawb(hawb.id, 'description', v), { required: true, placeholder: 'Goods description' })}
                      {renderField('Order Number', hawb.orderNumber, v => updateHawb(hawb.id, 'orderNumber', v), { placeholder: 'Customer order ref' })}
                      {renderField('Terms', hawb.terms, v => updateHawb(hawb.id, 'terms', v), { placeholder: 'e.g. FOB, CIF' })}
                      {renderField('Insurance', hawb.insurance, v => updateHawb(hawb.id, 'insurance', v), { placeholder: '0.00' })}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">AWB Type</Label>
                        <select
                          value={hawb.awbType}
                          onChange={e => handleAwbTypeChange(hawb.id, e.target.value)}
                          className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        >
                          <option value="">Select type</option>
                          {awbTypes.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Payment Mode</Label>
                        <select
                          value={hawb.paymentMode}
                          onChange={e => updateHawb(hawb.id, 'paymentMode', e.target.value)}
                          className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        >
                          <option value="PP">Prepaid (PP)</option>
                          <option value="CC">Collect (CC)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Currency</Label>
                        <select
                          value={hawb.currency}
                          onChange={e => updateHawb(hawb.id, 'currency', e.target.value)}
                          className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        >
                          <option value="USD">USD</option>
                          <option value="TZS">TZS</option>
                          <option value="KES">KES</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                      {renderField('Customs Value', hawb.customsValue, v => updateHawb(hawb.id, 'customsValue', v), {})}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Date Received</Label>
                        <DatePicker
                          value={hawb.dateReceived}
                          onChange={v => updateHawb(hawb.id, 'dateReceived', v)}
                          placeholder="Select date received"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Expected Arrival Date</Label>
                        <DatePicker
                          value={hawb.expectedArrivalDate}
                          onChange={v => updateHawb(hawb.id, 'expectedArrivalDate', v)}
                          placeholder="Select expected arrival"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Parcels / Items</h4>
                      <Button type="button" variant="ghost" size="sm" onClick={() => addParcel(hawb.id)} className="h-7 text-xs">
                        <Plus className="mr-1 h-3 w-3" /> Add Parcel
                      </Button>
                    </div>
                    {hawb.parcels.map((parcel, pIdx) => (
                      <div key={pIdx} className="mb-2 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Parcel #{pIdx + 1}</span>
                          {hawb.parcels.length > 1 && (
                            <button onClick={() => removeParcel(hawb.id, pIdx)} className="text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          {renderField('Description', parcel.description, v => updateParcel(hawb.id, pIdx, 'description', v), { required: true, placeholder: 'Item' })}
                          {renderField('Qty', parcel.quantity, v => updateParcel(hawb.id, pIdx, 'quantity', Number(v)), { type: 'number' })}
                          {renderField('Weight (kg)', parcel.weight, v => updateParcel(hawb.id, pIdx, 'weight', Number(v)), { type: 'number' })}
                          {renderField('Length (cm)', parcel.length, v => updateParcel(hawb.id, pIdx, 'length', Number(v)), { type: 'number' })}
                          {renderField('Width (cm)', parcel.width, v => updateParcel(hawb.id, pIdx, 'width', Number(v)), { type: 'number' })}
                          {renderField('Height (cm)', parcel.height, v => updateParcel(hawb.id, pIdx, 'height', Number(v)), { type: 'number' })}
                        </div>
                        {/* Volume display */}
                        <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>Volume: {(parcel.length * parcel.width * parcel.height).toLocaleString()} cm³</span>
                          <span>Vol. Wt: {calcVw(parcel.length, parcel.width, parcel.height)} kg</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Volume Summary */}
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Volume Summary</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Volume</Label>
                        <div className="flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                          {hawb.parcels.reduce((s, p) => s + (p.length * p.width * p.height) * p.quantity, 0).toLocaleString()} cm³
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Volumetric Weight</Label>
                        <div className="flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                          {hawb.parcels.reduce((s, p) => s + calcVw(p.length, p.width, p.height), 0)} kg
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Actual Weight</Label>
                        <div className="flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                          {hawb.parcels.reduce((s, p) => s + Number(p.weight), 0)} kg
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Freight</h4>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Rate (per kg)</Label>
                          <div className="flex h-8 items-center rounded-lg border border-blue-200 bg-white px-3 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-400">
                            {hawb.freightRate ? `${hawb.freightRate.toFixed(2)} ${hawb.currency}` : '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Chargeable Weight</Label>
                          <div className="flex h-8 items-center rounded-lg border border-blue-200 bg-white px-3 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-400">
                            {hawb.chargeableWeight} kg
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Freight Amount</Label>
                          <div className="flex h-8 items-center rounded-lg border border-green-200 bg-white px-3 text-sm font-bold text-green-700 dark:border-green-800 dark:bg-gray-900 dark:text-green-400">
                            <DollarSign className="mr-1 h-3 w-3" />
                            {hawb.freightAmount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                        {hawb.freightRate} × {hawb.chargeableWeight} = ${hawb.freightAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Plane className="h-4 w-4 text-blue-500" /> Flight Summary
            </h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Airline / Flight</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{airlineId || '-'} {flightNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Route</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stations.find(s => s.id === originStation)?.code || originStation} → {stations.find(s => s.id === destinationStation)?.code || destinationStation}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Departure</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{departureDate} {departureTime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">House AWBs</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{hawbs.filter(h => h.sender.name).length}</p>
              </div>
            </div>
          </div>

          {hawbs.filter(h => h.sender.name).map(hawb => (
            <div key={hawb.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{hawb.sender.name} → {hawb.receiver.name}</h4>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">${hawb.freightAmount.toFixed(2)}</span>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cargo</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {hawb.parcels.reduce((s, p) => s + p.quantity, 0)} pcs · {hawb.chargeableWeight} kg
                  </p>
                  <p className="text-xs text-gray-400">{hawb.description}</p>
                  {hawb.terms && <p className="text-xs text-gray-400">Terms: {hawb.terms}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dates</p>
                  <p className="text-xs text-gray-400">
                    {hawb.dateReceived ? `Received: ${hawb.dateReceived}` : ''}
                    {hawb.expectedArrivalDate ? ` | Expected: ${hawb.expectedArrivalDate}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="grid gap-4 text-center sm:grid-cols-3">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Total House AWBs</p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-300">{hawbs.filter(h => h.sender.name).length}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Total Chargeable Weight</p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-300">{hawbs.reduce((s, h) => s + h.chargeableWeight, 0)} kg</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Total Freight</p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-300">${hawbs.reduce((s, h) => s + h.freightAmount, 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-between">
        <div>
          {step > 0 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Previous</Button>}
        </div>
        {step < steps.length - 1 ? (
          <Button type="button" onClick={() => setStep(step + 1)} disabled={!canProceed()}>Next</Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitting || !canProceed()}>
            {submitting ? 'Creating...' : 'Create Export'}
          </Button>
        )}
      </div>
    </div>
  );
}
