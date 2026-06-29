'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, RefreshCw, AlertCircle, Loader2, Printer, Download, CheckCircle2, Copy, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/Skeleton';

const P = "#d00020";
const A = "#100030";
const L = "#F5F5F5";

interface BillingCharge {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference: string;
  paymentDate: string;
  notes?: string;
}

interface CustomerInfo {
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  email: string | null;
}

interface BillingDetail {
  id: string;
  houseAWBId?: string;
  masterAWBId?: string;
  status: string;
  totalAmount: number;
  currency: string;
  paidAmount: number;
  remainingAmount: number;
  billingCharges: BillingCharge[];
  payments: Payment[];
  createdAt: string;
  invoicedAt?: string;
  fullyPaidAt?: string;
  invoiceDetail?: string;
  customer?: CustomerInfo | null;
  houseAWB?: {
    houseAWBNumber?: string;
    chargeableWeight: number;
    freightRate: number;
    shipper: CustomerInfo;
    masterAWB?: {
      awbNumber: string;
      shipmentType: string;
      originStation: { name: string; code: string };
    } | null;
  } | null;
  exchangeRate: number;
}

export default function BillingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<BillingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payStatus, setPayStatus] = useState('paid');
  const [payMethod, setPayMethod] = useState('CASH');
  const [printing, setPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/billing/${params.id}`);
      const json = await res.json();
      if (json.success) setBill(json.data);
      else setError(json.error || 'Failed to load');
    } catch {
      setError('Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [params.id]);

  const handlePrint = () => {
    if (!bill || printing) return;
    setPrinting(true);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = `/workspace/billing/${bill.id}/print`;
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch { /* browser may block */ }
      }, 1000);
    };
    document.body.appendChild(iframe);
    setTimeout(() => {
      setPrinting(false);
      document.body.removeChild(iframe);
    }, 30000);
  };

  const markPayment = async () => {
    if (!bill) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/payments/confirm/${bill.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: payMethod, reference: `MANUAL-${Date.now()}` }),
      });
      const json = await res.json();
      if (json.success) setBill(json.data);
      else setError(json.error || 'Failed to record payment');
    } catch {
      setError('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/payment/invoice/${bill!.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
        <SkeletonCard />
      </div>
    );
  }

  if (error && !bill) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
          <h3 className="text-lg font-semibold text-gray-900">Invoice Not Found</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Button className="mt-4" onClick={fetchDetail}>
            <RefreshCw className="mr-1 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }
  if (!bill) return null;

  const isUnpaid = bill.status.toLowerCase() === 'unpaid' || bill.status.toLowerCase() === 'draft' || bill.status.toLowerCase() === 'not_billed';
  const items = bill.billingCharges.map((c) => ({
    description: c.description || c.type.replace(/_/g, ' '),
    price: c.amount,
    qty: 1,
    total: c.amount,
  }));
  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;
  const totalTzs = total * bill.exchangeRate;
  const invNum = bill.id.slice(0, 8).toUpperCase();

  const st = bill.status === 'PAID' || bill.status === 'paid' ? 'PAID' :
    bill.status === 'CREDITED' || bill.status === 'credited' ? 'CREDITED' : 'UNPAID';
  const stClr = st === 'PAID' ? ['#d4edda', '#155724'] :
    st === 'CREDITED' ? ['#cce5ff', '#004085'] : ['#fff3cd', '#856404'];

  return (
    <div className="relative min-h-screen bg-white" style={{ fontFamily: "'Helvetica', Arial, sans-serif" }}>
      <div className="relative z-10 mx-auto max-w-[210mm] px-6 py-6">
        {/* Decorative SVGs inside invoice area */}
        <div className="pointer-events-none absolute right-0 top-0 h-[200px] w-[200px] overflow-hidden">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <path d="M200 200C200 89.5 110.5 0 0 0H200V200Z" fill="#d00020" opacity="0.04" />
            <path d="M200 160C200 71.6 128.4 0 40 0H200V160Z" fill="#d00020" opacity="0.06" />
            <path d="M200 120C200 53.7 146.3 0 80 0H200V120Z" fill="#d00020" opacity="0.08" />
            <circle cx="160" cy="35" r="25" fill="#d00020" opacity="0.1" />
            <circle cx="180" cy="70" r="12" fill="#d00020" opacity="0.08" />
            <circle cx="150" cy="18" r="6" fill="#100030" opacity="0.12" />
            <circle cx="190" cy="100" r="5" fill="#d00020" opacity="0.15" />
            <circle cx="175" cy="125" r="3" fill="#d00020" opacity="0.12" />
            <path d="M140 0C150 25 170 35 200 35" stroke="#d00020" strokeWidth="0.8" fill="none" opacity="0.12" />
          </svg>
        </div>
        <div className="pointer-events-none absolute bottom-[180px] left-0 h-[160px] w-[160px] overflow-hidden">
          <svg width="160" height="160" viewBox="0 0 160 160" fill="none">
            <path d="M0 160C0 71.6 71.6 0 160 0V160H0Z" fill="#d00020" opacity="0.04" />
            <path d="M0 120C0 53.7 53.7 0 120 0V120H0Z" fill="#d00020" opacity="0.06" />
            <circle cx="25" cy="25" r="18" fill="#d00020" opacity="0.08" />
            <circle cx="55" cy="45" r="8" fill="#100030" opacity="0.06" />
            <circle cx="110" cy="90" r="5" fill="#d00020" opacity="0.1" />
            <circle cx="135" cy="115" r="3" fill="#d00020" opacity="0.12" />
            <path d="M0 85C25 95 55 90 80 105C105 120 135 115 160 125" stroke="#d00020" strokeWidth="0.8" fill="none" opacity="0.08" />
          </svg>
        </div>
        <div className="pointer-events-none absolute bottom-0 right-0 h-[50px] w-[240px] overflow-hidden">
          <svg width="240" height="50" viewBox="0 0 240 50" fill="none">
            <path d="M240 50C240 22.4 217.6 0 190 0H240V50Z" fill="#d00020" opacity="0.05" />
            <path d="M240 35C240 15.7 224.3 0 205 0H240V35Z" fill="#d00020" opacity="0.06" />
            <circle cx="220" cy="12" r="6" fill="#d00020" opacity="0.08" />
            <circle cx="230" cy="30" r="4" fill="#d00020" opacity="0.1" />
            <circle cx="205" cy="38" r="2" fill="#100030" opacity="0.12" />
            <path d="M135 50C145 42 160 38 175 40C190 42 205 38 225 42" stroke="#d00020" strokeWidth="0.6" fill="none" opacity="0.08" />
          </svg>
        </div>

        {/* Actions bar */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchDetail}>
              <RefreshCw className="mr-1 h-3 w-3" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={printing}>
              {printing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Printer className="mr-1 h-3 w-3" />}
              {printing ? 'Printing...' : 'Print'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(`/api/billing/${bill.id}/pdf`, '_blank')}>
              <Download className="mr-1 h-3 w-3" /> PDF
            </Button>
          </div>
        </div>

        {/* ═══ HEADER ═══ */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SIFEX"
              className="h-14 w-14 rounded-lg object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = 'flex';
              }} />
            <div className="hidden h-14 w-14 items-center justify-center rounded-lg" style={{ background: P }}>S</div>
            <div>
              <div className="text-xl font-bold tracking-wide" style={{ color: P }}>SIFEX COURIER SERVICES COMPANY LTD</div>
              <div className="mt-0.5 text-[9px] text-gray-400">International Shipping & Logistics</div>
              <div className="text-[8px] text-gray-300">Dar es Salaam, Tanzania | info@sifex.co.tz</div>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block rounded-lg px-5 py-2 shadow-md" style={{ background: `linear-gradient(135deg, ${P}, #0a0020)` }}>
              <div className="text-[9px] tracking-widest text-white/70 uppercase">Invoice</div>
              <div className="text-2xl font-bold tracking-widest text-white">{invNum}</div>
            </div>
            <div className="mt-1.5">
              <span className="inline-block rounded px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{ background: stClr[0], color: stClr[1] }}>{st}</span>
            </div>
          </div>
        </div>

        {/* ═══ CUSTOMER + INVOICE INFO ═══ */}
        <div className="mb-5 flex gap-8">
          <div className="flex-1">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: P }}>Invoice To</div>
            <div className="text-sm font-semibold text-gray-800">{bill.customer?.name || 'N/A'}</div>
            {bill.customer?.address && <div className="text-[10px] text-gray-500">{bill.customer.address}</div>}
            {bill.customer?.city && <div className="text-[10px] text-gray-500">{bill.customer.city}</div>}
            {bill.customer?.phone && <div className="text-[10px] text-gray-500">Phone: {bill.customer.phone}</div>}
            {bill.customer?.email && <div className="text-[10px] text-gray-500">Email: {bill.customer.email}</div>}
          </div>
          <div className="flex-1">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: P }}>Invoice Details</div>
            <table className="w-full">
              <tbody>
                {[
                  ['Invoice Number', invNum],
                  ['Invoice Date', bill.invoicedAt ? new Date(bill.invoicedAt).toLocaleDateString() : new Date(bill.createdAt).toLocaleDateString()],
                  ['Account Number', bill.houseAWB?.houseAWBNumber || '-'],
                  ['MAWB', bill.houseAWB?.masterAWB?.awbNumber || '-'],
                  ['Origin', bill.houseAWB?.masterAWB?.originStation?.code || '-'],
                ].map(([l, v]) => (
                  <tr key={l}>
                    <td className="w-px whitespace-nowrap py-0.5 pr-2 text-[9px] text-gray-400">{l}</td>
                    <td className="py-0.5 text-[10px] font-semibold text-gray-700">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ TWO-COLUMN BODY ═══ */}
        <div className="mb-6 flex gap-5">
          {/* LEFT SIDEBAR */}
          <div className="w-[190px] shrink-0">
            <div className="mb-3 rounded-lg p-4" style={{ background: L }}>
              <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: P }}>Payment Methods</div>
              <div className="mb-2.5">
                <div className="mb-1 text-[10px] font-semibold text-gray-700">Bank Transfer</div>
                <div className="text-[8.5px] leading-relaxed text-gray-500">
                  CRDB: 0151234567890<br />
                  NMB: 41234567890<br />
                  NBC: 011234567890
                </div>
              </div>
              <div className="mb-2.5">
                <div className="mb-1 text-[10px] font-semibold text-gray-700">Lipa Namba</div>
                <div className="text-[8.5px] leading-relaxed text-gray-500">
                  CRDB Lipa Hapa: 451234<br />
                  NMB Lipa: 561234<br />
                  NBC Lipa: 671234<br />
                  Vodacom Lipa: 123456<br />
                  Tigo Lipa: 234567<br />
                  Airtel Lipa: 345678
                </div>
              </div>
              <div className="mb-2.5">
                <div className="mb-1 text-[10px] font-semibold text-gray-700">Mobile Money</div>
                <div className="text-[8.5px] leading-relaxed text-gray-500">
                  M-Pesa<br />
                  TigoPesa<br />
                  AirtelMoney<br />
                  HaloPesa
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold text-gray-700">Card</div>
                <div className="text-[8.5px] text-gray-500">Pay via EvPay checkout link</div>
              </div>
            </div>

            {isUnpaid && (
              <div className="mb-3 rounded-lg p-4" style={{ background: L }}>
                <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: P }}>Share Link</div>
                <p className="mb-2 text-[9px] text-gray-500">Send this link to customer to pay online.</p>
                <div className="flex items-center gap-1.5">
                  <input readOnly value={`${window.location.origin}/payment/invoice/${bill.id}`}
                    className="h-8 flex-1 rounded border border-gray-200 bg-white px-2 text-[9px] text-gray-600" />
                  <a href={`/payment/invoice/${bill.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button size="sm" variant="outline" className="h-8 shrink-0 px-2 text-[9px]" onClick={copyLink}>
                    {copied ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )}

            {isUnpaid && (
              <div className="rounded-lg p-4" style={{ background: '#fffbeb' }}>
                <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">Manual Payment</div>
                <p className="mb-2.5 text-[9px] text-amber-700">For Lipa Namba, Bank, or Cash.</p>
                <div className="mb-2">
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                    className="h-8 w-full rounded border border-amber-200 bg-white px-2 text-[10px] text-gray-700">
                    <option value="LIPA_NAMBA">Lipa Namba</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <Button className="w-full text-[10px]" size="sm" onClick={markPayment} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  {submitting ? 'Processing...' : `Confirm ${payMethod.replace(/_/g, ' ')}`}
                </Button>
              </div>
            )}

            {!isUnpaid && (
              <div className="rounded-lg p-4" style={{ background: L }}>
                <div className="flex items-center gap-2.5">
                  <div className={`rounded-full p-1.5 ${st === 'PAID' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    {st === 'PAID' ? (
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    ) : (
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{st}</p>
                    <p className="text-[10px] text-gray-400">
                      {bill.fullyPaidAt
                        ? new Date(bill.fullyPaidAt).toLocaleDateString()
                        : bill.invoicedAt
                          ? `Invoiced ${new Date(bill.invoicedAt).toLocaleDateString()}`
                          : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 rounded-lg p-4" style={{ background: L }}>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: P }}>Terms & Conditions</div>
              <div className="text-[8.5px] leading-relaxed text-gray-500">
                Payment is due upon receipt of this invoice. A late fee of 2% per month may be applied to overdue balances. All charges are billed in USD; TZS equivalent is provided for reference at the prevailing exchange rate.
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Description', 'Price', 'Qty', 'Total'].map((h) => (
                    <th key={h} className="px-2.5 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-white"
                      style={{ background: P, textAlign: h === 'Price' || h === 'Qty' || h === 'Total' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td className="border-b border-gray-100 px-2.5 py-2 text-[10px] text-gray-700">{item.description}</td>
                    <td className="border-b border-gray-100 px-2.5 py-2 text-right text-[10px] text-gray-700">${item.price.toFixed(2)}</td>
                    <td className="border-b border-gray-100 px-2.5 py-2 text-right text-[10px] text-gray-700">{item.qty}</td>
                    <td className="border-b border-gray-100 px-2.5 py-2 text-right text-[10px] text-gray-700">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="ml-auto mt-2 w-[250px]">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="px-2.5 py-1 text-[10px] text-gray-500">Subtotal</td>
                    <td className="px-2.5 py-1 text-right text-[10px] text-gray-700">${subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-2.5 py-1 text-[10px] text-gray-500">Tax (18%)</td>
                    <td className="px-2.5 py-1 text-right text-[10px] text-gray-700">${tax.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-2.5 py-2 text-sm font-bold" style={{ color: P, borderTop: `2px solid ${P}` }}>TOTAL</td>
                    <td className="px-2.5 py-2 text-right text-sm font-bold" style={{ color: P, borderTop: `2px solid ${P}` }}>${total.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-2.5 py-0.5 text-[9px] text-gray-400">TZS Equivalent</td>
                    <td className="px-2.5 py-0.5 text-right text-[9px] text-gray-400">TZS {totalTzs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="px-2.5 py-0.5 text-right text-[8px] text-gray-300">Rate: 1 USD = {bill.exchangeRate} TZS</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment History */}
            {bill.payments.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: P }}>Payment History</div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Date', 'Method', 'Reference', 'Amount'].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-[8px] font-semibold uppercase tracking-wider text-gray-500"
                          style={{ background: '#f0f0f0', textAlign: h === 'Amount' ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bill.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="border-b border-gray-100 px-2 py-1.5 text-[9px] text-gray-600">{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td className="border-b border-gray-100 px-2 py-1.5 text-[9px] text-gray-600">{p.paymentMethod.replace(/_/g, ' ')}</td>
                        <td className="border-b border-gray-100 px-2 py-1.5 text-[9px] text-gray-600">{p.reference || '-'}</td>
                        <td className="border-b border-gray-100 px-2 py-1.5 text-right text-[9px] text-gray-600">{p.currency} {p.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: P }}>Manager Signature</div>
              <div className="mb-1.5 w-[200px] border-t border-gray-300" />
              <div className="text-sm font-semibold text-gray-700">Masanja Joseph</div>
              <div className="text-[9px] text-gray-400">General Manager</div>
            </div>
            <div className="text-right">
              <div className="text-[8px] text-gray-300">Invoice #{invNum}</div>
              <div className="text-[8px] text-gray-300">Generated {new Date().toLocaleString()}</div>
            </div>
          </div>

          <div className="flex justify-center gap-10 rounded-lg px-5 py-2.5"
            style={{ background: `linear-gradient(135deg, ${P}, #0a0020)` }}>
            {[
              ['Phone', '+255 688 930 963'],
              ['Email', 'info@sifex.co.tz'],
              ['Website', 'www.sifex.co.tz'],
            ].map(([l, v]) => (
              <div key={l} className="text-center">
                <div className="text-[7px] uppercase tracking-widest text-white/50">{l}</div>
                <div className="mt-0.5 text-[9px] font-semibold text-white">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
