'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Calculator, Package, DollarSign, Plane, ChevronDown, ChevronRight, Ship, UserSquare2 } from 'lucide-react';

const stationOptions = [
  { value: 'CAN', label: 'CAN - Guangzhou' },
  { value: 'HKG', label: 'HKG - Hong Kong' },
  { value: 'DAR', label: 'DAR - Dar es Salaam' },
  { value: 'DXB', label: 'DXB - Dubai' },
  { value: 'NBO', label: 'NBO - Nairobi' },
  { value: 'SHJ', label: 'SHJ - Sharjah' },
  { value: 'JNB', label: 'JNB - Johannesburg' },
  { value: 'MCT', label: 'MCT - Muscat' },
  { value: 'BOM', label: 'BOM - Mumbai' },
  { value: 'ADD', label: 'ADD - Addis Ababa' },
  { value: 'ZNZ', label: 'ZNZ - Zanzibar' },
];

const awbTypeOptions = [
  { value: 'CAN_GUANGZHOU', label: 'CAN - Guangzhou' },
  { value: 'HKG_HONGKONG', label: 'HKG - Hong Kong' },
  { value: 'DXB_DUBAI', label: 'DXB - Dubai' },
  { value: 'CAN_EXPRESS', label: 'CAN - Express' },
  { value: 'MCO_EXPRESS', label: 'MCO - Express' },
];
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

interface SenderReceiverFields {
  name: string;
  company: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

interface ParcelItem {
  description: string;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  volumeWeight?: number;
}

interface HAWBEntry {
  id: string;
  previewTracking: string;
  sender: SenderReceiverFields;
  receiver: SenderReceiverFields;
  description: string;
  paymentMode: 'PP' | 'CC';
  currency: string;
  customsValue: number;
  insurance: number;
  orderNumber: string;
  terms: string;
  dateReceived: string;
  expectedArrivalDate: string;
  awbType: string;
  parcels: ParcelItem[];
  freightRate: number;
  freightAmount: number;
  chargeableWeight: number;
}

interface MAWBInfo {
  airlineId: string;
  flightNumber: string;
  originStation: string;
  destinationStation: string;
  departureDate: string;
  arrivalDate: string;
  agentName: string;
  agentCompany: string;
  agentPhone: string;
  agentAddress: string;
  agentCity: string;
  agentCountry: string;
}

const emptySR: SenderReceiverFields = {
  name: '', company: '', phone: '', address: '', city: '', country: '',
};

const emptyParcel: ParcelItem = {
  description: '', quantity: 1, weight: 0, length: 0, width: 0, height: 0,
};

const defaultMAWB: MAWBInfo = {
  airlineId: '', flightNumber: '', originStation: '', destinationStation: '',
  departureDate: '', arrivalDate: '',
  agentName: '', agentCompany: '', agentPhone: '', agentAddress: '',
  agentCity: '', agentCountry: '',
};

function genPreviewTracking(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `HAWB-SFX-${rand}`;
}

function createHAWB(): HAWBEntry {
  return {
    id: Math.random().toString(36).slice(2),
    previewTracking: genPreviewTracking(),
    sender: { ...emptySR },
    receiver: { ...emptySR },
    description: '',
    paymentMode: 'PP', currency: 'USD', customsValue: 0, insurance: 0,
    orderNumber: '', terms: '', dateReceived: '', expectedArrivalDate: '', awbType: '',
    parcels: [{ ...emptyParcel }],
    freightRate: 0, freightAmount: 0, chargeableWeight: 0,
  };
}

const calcVolumeWeight = (l: number, w: number, h: number) => Math.round((l * w * h) / 6000);

const DRAFT_KEY = 'sifex-cargo-draft';

interface DraftData {
  mawb: MAWBInfo;
  hawbs: HAWBEntry[];
  step: number;
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

function saveDraft(mawb: MAWBInfo, hawbs: HAWBEntry[], step: number) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ mawb, hawbs, step })); } catch {}
}

function loadDraft(): DraftData | null {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

interface AcceptCargoDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AcceptCargoDialog({ trigger, onSuccess }: AcceptCargoDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mawb, setMawb] = useState<MAWBInfo>(defaultMAWB);
  const [hawbs, setHawbs] = useState<HAWBEntry[]>([createHAWB()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [expandedHawb, setExpandedHawb] = useState<string>(hawbs[0].id);
  const [resumeDraft, setResumeDraft] = useState<DraftData | null>(null);

  useEffect(() => {
    if (open) {
      const draft = loadDraft();
      if (draft) setResumeDraft(draft);
    } else {
      setResumeDraft(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && !submitting) {
      saveDraft(mawb, hawbs, step);
    }
  }, [mawb, hawbs, step, open, submitting]);

  const doResume = () => {
    if (!resumeDraft) return;
    setMawb(resumeDraft.mawb);
    setHawbs(resumeDraft.hawbs);
    setStep(resumeDraft.step);
    setExpandedHawb(resumeDraft.hawbs[0]?.id || '');
    setResumeDraft(null);
  };

  const doDiscardDraft = () => {
    clearDraft();
    setResumeDraft(null);
    setMawb(defaultMAWB);
    setHawbs([createHAWB()]);
    setStep(0);
    setExpandedHawb('');
  };

  const steps = ['MAWB Info', 'House AWBs', 'Review'];

  const updateMAWB = (field: keyof MAWBInfo, value: string) =>
    setMawb((prev) => ({ ...prev, [field]: value }));

  const updateHawb = useCallback((hawbId: string, field: keyof HAWBEntry, value: any) => {
    setHawbs((prev) => prev.map((h) => (h.id === hawbId ? { ...h, [field]: value } : h)));
  }, []);

  const updateHawbSender = (hawbId: string, field: keyof SenderReceiverFields, value: string) => {
    setHawbs((prev) =>
      prev.map((h) => (h.id === hawbId ? { ...h, sender: { ...h.sender, [field]: value } } : h))
    );
  };

  const updateHawbReceiver = (hawbId: string, field: keyof SenderReceiverFields, value: string) => {
    setHawbs((prev) =>
      prev.map((h) => (h.id === hawbId ? { ...h, receiver: { ...h.receiver, [field]: value } } : h))
    );
  };

  const updateParcel = (hawbId: string, parcelIdx: number, field: keyof ParcelItem, value: string | number) => {
    setHawbs((prev) =>
      prev.map((h) => {
        if (h.id !== hawbId) return h;
        const updated = [...h.parcels];
        updated[parcelIdx] = { ...updated[parcelIdx], [field]: value };

        const l = field === 'length' ? Number(value) : updated[parcelIdx].length;
        const w = field === 'width' ? Number(value) : updated[parcelIdx].width;
        const hgt = field === 'height' ? Number(value) : updated[parcelIdx].height;
        const vw = calcVolumeWeight(l, w, hgt);
        updated[parcelIdx] = { ...updated[parcelIdx], volumeWeight: vw };

        const totalWeight = updated.reduce((s, p) => s + Number(p.weight), 0);
        const totalVw = updated.reduce((s, p) => s + calcVolumeWeight(p.length, p.width, p.height), 0);
        const chargeableWeight = Math.max(totalWeight, totalVw);
        const rate = h.freightRate;

        return {
          ...h,
          parcels: updated,
          chargeableWeight,
          freightAmount: rate * chargeableWeight,
        };
      })
    );
  };

  const addParcel = (hawbId: string) => {
    setHawbs((prev) =>
      prev.map((h) => (h.id === hawbId ? { ...h, parcels: [...h.parcels, { ...emptyParcel }] } : h))
    );
  };

  const removeParcel = (hawbId: string, idx: number) => {
    setHawbs((prev) =>
      prev.map((h) => {
        if (h.id !== hawbId || h.parcels.length <= 1) return h;
        const updated = h.parcels.filter((_, i) => i !== idx);
        return { ...h, parcels: updated };
      })
    );
  };

  const updateHawbAwbType = (hawbId: string, awbType: string) => {
    setHawbs((prev) => prev.map((h) => h.id === hawbId ? { ...h, awbType } : h));
    fetchRateForHawb(hawbId, awbType);
  };

  const updateFreightRate = (hawbId: string, rate: number) => {
    setHawbs((prev) =>
      prev.map((h) =>
        h.id === hawbId
          ? { ...h, freightRate: rate, freightAmount: rate * h.chargeableWeight }
          : h
      )
    );
  };

  const fetchRateForHawb = useCallback(async (hawbId: string, awbType: string) => {
    if (!awbType) return;
    try {
      const res = await fetch(`/api/freight-rates?shipmentType=${encodeURIComponent(awbType)}&isActive=true`);
      if (res.ok) {
        const json = await res.json();
        const rates = json.data || json;
        if (rates.length > 0) {
          const rate = parseFloat(rates[0].ratePerKg) || 0;
          const hawb = hawbs.find(h => h.id === hawbId);
          if (hawb) {
            updateFreightRate(hawbId, rate);
          }
        }
      }
    } catch {}
  }, [hawbs]);

  const addHawb = () => {
    const h = createHAWB();
    setHawbs((prev) => [...prev, h]);
    setExpandedHawb(h.id);
  };

  const removeHawb = (hawbId: string) => {
    if (hawbs.length <= 1) return;
    setHawbs((prev) => prev.filter((h) => h.id !== hawbId));
    if (expandedHawb === hawbId) {
      setExpandedHawb(hawbs[0].id === hawbId ? hawbs[1]?.id : hawbs[0].id);
    }
  };

  const canProceed = () => {
    if (step === 0) return mawb.originStation && mawb.destinationStation && mawb.flightNumber;
    if (step === 1) {
      return hawbs.some((h) =>
        h.sender.name && h.receiver.name && h.description &&
        h.parcels.some((p) => p.description && p.weight > 0)
      );
    }
    return true;
  };

  const renderField = (
    label: string,
    value: string | number,
    onChange: (v: string) => void,
    opts?: { type?: string; placeholder?: string; required?: boolean; className?: string }
  ) => (
    <div className={cn('space-y-1', opts?.className)}>
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}
        {opts?.required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      <Input
        type={opts?.type || 'text'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts?.placeholder}
        step={opts?.type === 'number' ? 'any' : undefined}
        className={cn('h-8 text-sm', opts?.className)}
      />
    </div>
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const mawbRes = await fetch('/api/master-awbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awbNumber: `MAWB-${Date.now()}`,
          originStationId: mawb.originStation,
          destinationStationId: mawb.destinationStation,
          airlineId: mawb.airlineId,
          flightNumber: mawb.flightNumber,
          departureTime: mawb.departureDate || undefined,
          arrivalTime: mawb.arrivalDate || undefined,
          senderName: mawb.agentName,
          senderCompany: mawb.agentCompany,
          senderPhone: mawb.agentPhone,
          senderAddress: mawb.agentAddress,
          senderCity: mawb.agentCity,
          senderCountry: mawb.agentCountry,
          receiverName: mawb.agentName,
          receiverCompany: mawb.agentCompany,
          shipmentType: hawbs.find(h => h.awbType)?.awbType || 'CAN_GUANGZHOU',
          paymentMode: 'PP',
          currency: 'USD',
        }),
      });
      if (!mawbRes.ok) throw new Error('Failed to create Master AWB');
      const mawbData = await mawbRes.json();
      const masterAWBId = mawbData.data?.id || mawbData.id;

      for (const hawb of hawbs) {
        if (!hawb.sender.name) continue;

        const shipperRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: hawb.sender.name,
            code: `SHP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'COMPANY',
            phone: hawb.sender.phone,
            address: hawb.sender.address,
            city: hawb.sender.city,
            country: hawb.sender.country,
            contactPerson: hawb.sender.name,
            contactEmail: '',
          }),
        });
        if (!shipperRes.ok) throw new Error('Failed to create shipper');
        const shipperData = await shipperRes.json();
        const shipperId = shipperData.data?.id || shipperData.id;

        const receiverRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: hawb.receiver.name,
            code: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'COMPANY',
            phone: hawb.receiver.phone,
            address: hawb.receiver.address,
            city: hawb.receiver.city,
            country: hawb.receiver.country,
            contactPerson: hawb.receiver.name,
            contactEmail: '',
          }),
        });
        if (!receiverRes.ok) throw new Error('Failed to create receiver');
        const receiverData = await receiverRes.json();
        const receiverId = receiverData.data?.id || receiverData.id;

        const hawbRes = await fetch('/api/house-awbs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            houseAWBNumber: `HAWB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            masterAWBId,
            shipperId,
            receiverId,
            pieces: hawb.parcels.reduce((s, p) => s + p.quantity, 0),
            weight: hawb.parcels.reduce((s, p) => s + p.weight, 0),
            chargeableWeight: hawb.chargeableWeight,
            freight: hawb.freightAmount,
            freightRate: hawb.freightRate,
            description: hawb.description,
            paymentMode: hawb.paymentMode,
            currency: hawb.currency,
            customsValue: hawb.customsValue,
            insurance: hawb.insurance,
            orderNumber: hawb.orderNumber || undefined,
            shipmentType: hawb.awbType || undefined,
          }),
        });
        if (!hawbRes.ok) throw new Error('Failed to create House AWB');
        const hawbData = await hawbRes.json();
        const houseAWBId = hawbData.data?.id || hawbData.id;

        for (const parcel of hawb.parcels) {
          if (!parcel.description) continue;
          const parRes = await fetch('/api/parcels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              houseAWBId,
              parcelTrackingNumber: `PK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              barcode: `BAR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              description: parcel.description,
              quantity: parcel.quantity,
              actualWeight: parcel.weight,
              length: parcel.length,
              width: parcel.width,
              height: parcel.height,
              packageType: 'CTN',
            }),
          });
          if (!parRes.ok) throw new Error('Failed to create parcel');
        }
      }

      clearDraft();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) clearDraft(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Package className="h-4 w-4" />
            Accept Cargo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plane className="h-5 w-5 text-blue-600" />
            Accept Cargo — New Consolidation
          </DialogTitle>
          <DialogDescription>
            Creates one Master AWB with multiple House AWBs under consolidation
          </DialogDescription>
          {resumeDraft && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                <Package className="h-4 w-4 shrink-0" />
                <span>Unsaved draft found ({resumeDraft.hawbs.filter(h => h.sender.name).length || 0} HAWBs filled)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={doDiscardDraft} className="h-7 text-xs">
                  Discard
                </Button>
                <Button type="button" size="sm" onClick={doResume} className="h-7 text-xs">
                  Resume Draft
                </Button>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex items-center gap-1 overflow-x-auto py-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => setStep(i)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                  step === i
                    ? 'bg-blue-600 text-white'
                    : i < step
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                )}
              >
                {i < step ? '\u2713' : i + 1}
                {s}
              </button>
              {i < steps.length - 1 && (
                <div className={cn('h-px w-4', i < step ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700')} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4 py-2">
          {/* Step 0: MAWB Info */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Ship className="h-4 w-4 text-blue-500" />
                Master Air Waybill — Flight & Airline Info
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {renderField('Airline Code', mawb.airlineId, (v) => updateMAWB('airlineId', v), { placeholder: 'e.g. KQ, ET, TK' })}
                {renderField('Flight Number', mawb.flightNumber, (v) => updateMAWB('flightNumber', v), { required: true, placeholder: 'e.g. KQ-482' })}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Origin Station <span className="ml-0.5 text-red-500">*</span></Label>
                  <select
                    value={mawb.originStation}
                    onChange={(e) => updateMAWB('originStation', e.target.value)}
                    className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Select origin</option>
                    {stationOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Destination Station <span className="ml-0.5 text-red-500">*</span></Label>
                  <select
                    value={mawb.destinationStation}
                    onChange={(e) => updateMAWB('destinationStation', e.target.value)}
                    className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Select destination</option>
                    {stationOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {renderField('Departure Date', mawb.departureDate, (v) => updateMAWB('departureDate', v), { type: 'datetime-local' })}
                {renderField('Arrival Date', mawb.arrivalDate, (v) => updateMAWB('arrivalDate', v), { type: 'datetime-local' })}
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Agent Information (Sifex)
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {renderField('Agent Name', mawb.agentName, (v) => updateMAWB('agentName', v), { placeholder: 'Full name' })}
                  {renderField('Company', mawb.agentCompany, (v) => updateMAWB('agentCompany', v), { placeholder: 'Sifex Logistics' })}
                  {renderField('Phone', mawb.agentPhone, (v) => updateMAWB('agentPhone', v), { placeholder: '+255 xxx xxx' })}
                  {renderField('Address', mawb.agentAddress, (v) => updateMAWB('agentAddress', v), { placeholder: 'Street address' })}
                  {renderField('City', mawb.agentCity, (v) => updateMAWB('agentCity', v), { placeholder: 'City' })}
                  {renderField('Country', mawb.agentCountry, (v) => updateMAWB('agentCountry', v), { placeholder: 'Country' })}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: House AWBs */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <UserSquare2 className="h-4 w-4 text-blue-500" />
                  House Air Waybills (Customers)
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addHawb}>
                  <Plus className="mr-1 h-3 w-3" /> Add HAWB
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Each House AWB represents a different customer shipment under this consolidation.
              </p>

              {hawbs.map((hawb, hawbIdx) => (
                <div
                  key={hawb.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <button
                    onClick={() => setExpandedHawb(expandedHawb === hawb.id ? '' : hawb.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {expandedHawb === hawb.id ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {hawb.previewTracking}
                      </span>
                      {hawb.sender.name && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          — {hawb.sender.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hawb.freightAmount > 0 && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          ${hawb.freightAmount.toFixed(2)}
                        </span>
                      )}
                      {hawbs.length > 1 && (
                        <span
                          onClick={(e) => { e.stopPropagation(); removeHawb(hawb.id); }}
                          className="cursor-pointer text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </button>

                  {expandedHawb === hawb.id && (
                    <div className="space-y-4 border-t border-gray-100 px-4 py-4 dark:border-gray-800">
                      {/* Sender */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Shipper (Sender)
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {renderField('Name', hawb.sender.name, (v) => updateHawbSender(hawb.id, 'name', v), { required: true, placeholder: 'Full name' })}
                          {renderField('Company', hawb.sender.company, (v) => updateHawbSender(hawb.id, 'company', v), { placeholder: 'Company name' })}
                          {renderField('Phone', hawb.sender.phone, (v) => updateHawbSender(hawb.id, 'phone', v), { placeholder: '+255 xxx xxx' })}
                          {renderField('Address', hawb.sender.address, (v) => updateHawbSender(hawb.id, 'address', v), { placeholder: 'Street address' })}
                          {renderField('City', hawb.sender.city, (v) => updateHawbSender(hawb.id, 'city', v), { placeholder: 'City' })}
                          {renderField('Country', hawb.sender.country, (v) => updateHawbSender(hawb.id, 'country', v), { placeholder: 'Country' })}
                        </div>
                      </div>

                      {/* Receiver */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Consignee (Receiver)
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {renderField('Name', hawb.receiver.name, (v) => updateHawbReceiver(hawb.id, 'name', v), { required: true, placeholder: 'Full name' })}
                          {renderField('Company', hawb.receiver.company, (v) => updateHawbReceiver(hawb.id, 'company', v), { placeholder: 'Company name' })}
                          {renderField('Phone', hawb.receiver.phone, (v) => updateHawbReceiver(hawb.id, 'phone', v), { placeholder: '+255 xxx xxx' })}
                          {renderField('Address', hawb.receiver.address, (v) => updateHawbReceiver(hawb.id, 'address', v), { placeholder: 'Street address' })}
                          {renderField('City', hawb.receiver.city, (v) => updateHawbReceiver(hawb.id, 'city', v), { placeholder: 'City' })}
                          {renderField('Country', hawb.receiver.country, (v) => updateHawbReceiver(hawb.id, 'country', v), { placeholder: 'Country' })}
                        </div>
                      </div>

                      {/* Shipment Details */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Shipment Details
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {renderField('Description', hawb.description, (v) => updateHawb(hawb.id, 'description', v), { required: true, placeholder: 'Goods description' })}
                          {renderField('Order Number', hawb.orderNumber, (v) => updateHawb(hawb.id, 'orderNumber', v), { placeholder: 'Customer order ref' })}
                          {renderField('Terms', hawb.terms, (v) => updateHawb(hawb.id, 'terms', v), { placeholder: 'e.g. FOB, CIF' })}
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">AWB Type</Label>
                            <select
                              value={hawb.awbType}
                              onChange={(e) => updateHawbAwbType(hawb.id, e.target.value)}
                              className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                              <option value="">Select AWB Type</option>
                              {awbTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Date Received</Label>
                            <DatePicker
                              value={hawb.dateReceived}
                              onChange={(v) => updateHawb(hawb.id, 'dateReceived', v)}
                              placeholder="Select date received"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Expected Arrival Date</Label>
                            <DatePicker
                              value={hawb.expectedArrivalDate}
                              onChange={(v) => updateHawb(hawb.id, 'expectedArrivalDate', v)}
                              placeholder="Select expected arrival"
                            />
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Payment Mode</Label>
                            <select
                              value={hawb.paymentMode}
                              onChange={(e) => updateHawb(hawb.id, 'paymentMode', e.target.value)}
                              className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                              <option value="PP">Prepaid (PP)</option>
                              <option value="CC">Collect (CC)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Currency</Label>
                            <select
                              value={hawb.currency}
                              onChange={(e) => updateHawb(hawb.id, 'currency', e.target.value)}
                              className="flex h-8 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                              <option value="USD">USD</option>
                              <option value="TZS">TZS</option>
                              <option value="KES">KES</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </div>
                          {renderField('Customs Value', hawb.customsValue, (v) => updateHawb(hawb.id, 'customsValue', Number(v)), { type: 'number' })}
                          {renderField('Insurance', hawb.insurance, (v) => updateHawb(hawb.id, 'insurance', Number(v)), { type: 'number' })}
                        </div>
                      </div>

                      {/* Parcels */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Parcels / Items
                          </h4>
                          <Button type="button" variant="ghost" size="sm" onClick={() => addParcel(hawb.id)} className="h-7 text-xs">
                            <Plus className="mr-1 h-3 w-3" /> Add Parcel
                          </Button>
                        </div>
                        {hawb.parcels.map((parcel, pIdx) => (
                          <div
                            key={pIdx}
                            className="mb-2 rounded border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50"
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                Parcel #{pIdx + 1}
                              </span>
                              {hawb.parcels.length > 1 && (
                                <button
                                  onClick={() => removeParcel(hawb.id, pIdx)}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                              {renderField('Desc', parcel.description, (v) => updateParcel(hawb.id, pIdx, 'description', v), { required: true, placeholder: 'Item' })}
                              {renderField('Qty', parcel.quantity, (v) => updateParcel(hawb.id, pIdx, 'quantity', Number(v)), { type: 'number' })}
                              {renderField('Weight kg', parcel.weight, (v) => updateParcel(hawb.id, pIdx, 'weight', Number(v)), { type: 'number' })}
                              {renderField('L cm', parcel.length, (v) => updateParcel(hawb.id, pIdx, 'length', Number(v)), { type: 'number' })}
                              {renderField('W cm', parcel.width, (v) => updateParcel(hawb.id, pIdx, 'width', Number(v)), { type: 'number' })}
                              {renderField('H cm', parcel.height, (v) => updateParcel(hawb.id, pIdx, 'height', Number(v)), { type: 'number' })}
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>Volume: {(parcel.length * parcel.width * parcel.height).toLocaleString()} cm³</span>
                            <span>Vol. Wt: {calcVolumeWeight(parcel.length, parcel.width, parcel.height)} kg</span>
                          </div>
                        </div>
                      ))}

                      {/* Freight */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Freight
                        </h4>
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
                          <div className="grid gap-3 sm:grid-cols-3">
                            {renderField('Rate (per kg)', hawb.freightRate, (v) => updateFreightRate(hawb.id, Number(v)), { type: 'number', placeholder: '0.00' })}
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
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Package className="h-4 w-4 text-blue-500" />
                Review Consolidation
              </h3>

              {/* MAWB Summary */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Master AWB — Flight
                </h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Airline / Flight</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {mawb.airlineId || '-'} {mawb.flightNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Route</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {mawb.originStation} → {mawb.destinationStation}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Agent</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {mawb.agentName || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* HAWBs Summary */}
              {hawbs.filter((h) => h.sender.name).map((hawb, idx) => (
                <div key={hawb.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {hawb.previewTracking} — {hawb.sender.name}
                    </h4>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      ${hawb.freightAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Shipper</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{hawb.sender.name}</p>
                      <p className="text-xs text-gray-400">{hawb.sender.company} · {hawb.sender.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Consignee</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{hawb.receiver.name}</p>
                      <p className="text-xs text-gray-400">{hawb.receiver.company} · {hawb.receiver.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cargo</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {hawb.parcels.reduce((s, p) => s + p.quantity, 0)} pcs · {hawb.chargeableWeight} kg
                      </p>
                      <p className="text-xs text-gray-400">{hawb.description}</p>
                      {hawb.awbType && <p className="text-xs text-gray-400">Type: {hawb.awbType.replace(/_/g, ' ')}</p>}
                      {hawb.orderNumber && <p className="text-xs text-gray-400">Order: {hawb.orderNumber}</p>}
                    </div>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                <div className="grid gap-2 text-center sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Total House AWBs</p>
                    <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      {hawbs.filter((h) => h.sender.name).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Total Chargeable Weight</p>
                    <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      {hawbs.reduce((s, h) => s + h.chargeableWeight, 0)} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Total Freight</p>
                    <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      ${hawbs.reduce((s, h) => s + h.freightAmount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Previous
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button type="button" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting || !canProceed()}>
              {submitting ? 'Creating...' : 'Create Consolidation'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
