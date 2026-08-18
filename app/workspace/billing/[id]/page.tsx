'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  ArrowLeft, RefreshCw, AlertCircle, Loader2, Download, CheckCircle2, Copy, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import EnterpriseInvoice, { type InvoiceData, type InvoiceItem } from '@/components/invoice/EnterpriseInvoice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PinInput } from '@/components/ui/PinInput';

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
    trackingNumber?: string;
    chargeableWeight: number;
    freightRate: number;
    description?: string | null;
    shipper: CustomerInfo;
    masterAWB?: {
      awbNumber: string;
      shipmentType: string;
      originStation: { name: string; code: string };
    } | null;
  } | null;
  exchangeRate: number;
  exchangeRateDate?: string;
  signedBy?: { name: string; title: string; signatureImage?: string } | null;
  signedAt?: string;
}

export default function BillingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [bill, setBill] = useState<BillingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [payMethod, setPayMethod] = useState('CASH');
  const [copied, setCopied] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState('');

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

  const confirmPayment = async () => {
    if (!bill) return;
    setShowPinModal(true);
    setPinValue('');
    setSignError('');
  };

  const handlePaymentWithSign = async () => {
    if (!bill || signing) return;
    setSigning(true);
    setError('');
    setSignError('');
    try {
      if (!bill.signedBy) {
        const signRes = await fetch(`/api/billing/${bill.id}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinValue }),
        });
        const signJson = await signRes.json();
        if (signJson.success) {
          setBill(prev => prev ? { ...prev, signedBy: signJson.data.signer, signedAt: signJson.data.signedAt } : prev);
        } else {
          setShowPinModal(false);
          setPinValue('');
          setSigning(false);
          setError(signJson.error || 'PIN verification failed');
          return;
        }
      }

      const payRes = await fetch(`/api/payments/confirm/${bill.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: payMethod, reference: `MANUAL-${Date.now()}` }),
      });
      const payJson = await payRes.json();
      if (payJson.success) setBill(payJson.data);
      else setError(payJson.error || 'Failed to record payment');

      setShowPinModal(false);
      setPinValue('');
    } catch (e) {
      setError('Failed to process payment');
    } finally {
      setSigning(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/payment/invoice/${bill!.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSign = async () => {
    if (!bill || signing) return;
    setSigning(true);
    setSignError('');
    try {
      const res = await fetch(`/api/billing/${bill.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      });
      const json = await res.json();
      if (json.success) {
        setBill({ ...bill, signedBy: json.data.signer, signedAt: json.data.signedAt });
        setShowPinModal(false);
        setPinValue('');
      } else {
        setSignError(json.error || 'Sign failed');
      }
    } catch {
      setSignError('Failed to sign invoice');
    } finally {
      setSigning(false);
    }
  };

  const handleDownload = async () => {
    if (!bill || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoice/${bill.id}/pdf`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SIFEX-INVOICE-${bill.id.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download error:', e);
      setError('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
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

  const rate = bill.exchangeRate || 2500;
  const cargoDesc = bill.houseAWB?.description || '';
  const hwbTrk = bill.houseAWB?.trackingNumber || bill.houseAWB?.houseAWBNumber || '';
  const mawbNum = bill.houseAWB?.masterAWB?.awbNumber || '';
  const items: InvoiceItem[] = bill.billingCharges.map((c) => ({
    product: cargoDesc ? `${cargoDesc} (${hwbTrk} - ${mawbNum})` : c.description || c.type.replace(/_/g, ' '),
    price: c.amount,
    qty: 1,
    total: c.amount,
    priceTsh: c.amount * rate,
    totalTsh: c.amount * rate,
  }));
  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const subtotalTsh = items.reduce((a, i) => a + (i.totalTsh || 0), 0);
  const tax = subtotal * 0.18;
  const taxTsh = subtotalTsh * 0.18;
  const total = subtotal + tax;
  const totalTsh = subtotalTsh + taxTsh;
  const invNum = bill.id.slice(0, 8).toUpperCase();

  const invoiceData: InvoiceData = {
    invoiceNo: invNum,
    invoiceDate: bill.invoicedAt
      ? new Date(bill.invoicedAt).toLocaleDateString('en-GB')
      : new Date(bill.createdAt).toLocaleDateString('en-GB'),
    accountNo: bill.houseAWB?.houseAWBNumber || '-',
    company: {
      name: 'Sifex Air Cargo',
      logo: '',
      address: 'Dar es Salaam, Tanzania',
      phone: '+255 688 930 963 (Mobile)',
      email: 'info@sifex.co.tz',
      website: 'www.sifex.co.tz',
    },
    customer: {
      name: bill.customer?.name || 'N/A',
      address: [bill.customer?.address, bill.customer?.city].filter(Boolean).join(', ') || 'N/A',
      phone: bill.customer?.phone || 'N/A',
    },
    items,
    paymentMethods: bill.payments.length > 0
      ? bill.payments.map(p => p.paymentMethod.replace(/_/g, ' '))
      : ['Bank Transfer', 'Lipa Namba', 'Mobile Money', 'Card'],
    subtotal,
    tax,
    taxRate: 18,
    total,
    exchangeRate: rate,
    subtotalTsh,
    taxTsh,
    totalTsh,
    terms: 'Payment is due upon receipt. Late fee of 2% per month applies.',
    managerName: session?.user?.name || '',
    managerTitle: session?.user?.positionName || '',
    exchangeRateDate: bill.exchangeRateDate
      ? new Date(bill.exchangeRateDate).toLocaleDateString('en-GB')
      : undefined,
    signedByName: bill.signedBy?.name || undefined,
    signedByTitle: bill.signedBy?.title || undefined,
    signedByImage: bill.signedBy?.signatureImage || undefined,
    signedAt: bill.signedAt
      ? new Date(bill.signedAt).toLocaleDateString('en-GB')
      : undefined,
    status: bill.status,
  };

  const isPaid = bill.status === 'PAID' || bill.status === 'paid' || bill.status === 'CREDITED' || bill.status === 'credited';

  return (
    <div className="mx-auto max-w-[210mm] space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDetail}>
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
          {!isPaid && (
            <div className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                className="h-7 rounded border-0 bg-transparent text-[10px] text-gray-700 focus:outline-none">
                <option value="LIPA_NAMBA">Lipa Namba</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CASH">Cash</option>
              </select>
              <Button size="sm" className="h-7 text-[10px]" onClick={confirmPayment} disabled={submitting}>
                {submitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                {submitting ? '...' : `Confirm ${payMethod.replace(/_/g, ' ')}`}
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
            {downloading ? 'Downloading...' : 'PDF'}
          </Button>
          {bill.signedBy && (
            <span className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[10px] text-green-700">
              <CheckCircle2 className="h-3 w-3" /> Signed
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <EnterpriseInvoice data={invoiceData} hideActions colors={{ primary: '#d00020', secondary: '#100030', accent: '#F5F5F5' }} />

      {bill.payments.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Payment History</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {['Date', 'Method', 'Reference', 'Amount'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bill.payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-xs text-gray-600">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{p.paymentMethod.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{p.reference || '-'}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-600">{p.currency} {p.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isPaid && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-gray-500">Share payment link:</span>
          <input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/payment/invoice/${bill.id}`}
            className="h-8 flex-1 rounded border border-gray-200 bg-gray-50 px-2 text-xs text-gray-600" />
          <a href={`/payment/invoice/${bill.id}`} target="_blank" rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50">
            <ExternalLink className="h-3 w-3" />
          </a>
          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={copyLink}>
            {copied ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      )}

      {/* Confirm Payment PIN Modal */}
      {isMobile ? (
        <BottomSheet
          open={showPinModal}
          onClose={() => { setShowPinModal(false); setPinValue(''); setSignError(''); }}
          title={bill?.signedBy ? `Confirm ${payMethod.replace(/_/g, ' ')}` : `Confirm ${payMethod.replace(/_/g, ' ')}`}
          description="Enter your PIN to authorize this payment."
        >
          <PinInput
            value={pinValue}
            onChange={setPinValue}
            length={5}
            label="PIN"
            error={!!signError}
            errorMessage={signError || undefined}
            disabled={signing}
          />
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setShowPinModal(false); setPinValue(''); setSignError(''); }}>
              Cancel
            </Button>
            <Button className="flex-1 bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handlePaymentWithSign} disabled={signing || pinValue.length < 4}>
              {signing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {signing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </BottomSheet>
      ) : (
        <Dialog open={showPinModal} onOpenChange={(v) => { if (!v) { setShowPinModal(false); setPinValue(''); setSignError(''); } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{bill?.signedBy ? `Confirm ${payMethod.replace(/_/g, ' ')}` : `Confirm ${payMethod.replace(/_/g, ' ')}`}</DialogTitle>
              <DialogDescription>Enter your PIN to authorize this payment.</DialogDescription>
            </DialogHeader>
            <PinInput
              value={pinValue}
              onChange={setPinValue}
              length={5}
              error={!!signError}
              errorMessage={signError || undefined}
              disabled={signing}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setShowPinModal(false); setPinValue(''); setSignError(''); }}>
                Cancel
              </Button>
              <Button size="sm" className="bg-[#d00020] text-white hover:bg-[#d00020]/90" onClick={handlePaymentWithSign} disabled={signing || pinValue.length < 4}>
                {signing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                {signing ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
