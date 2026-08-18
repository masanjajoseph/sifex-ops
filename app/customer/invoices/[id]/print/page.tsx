'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EnterpriseInvoice, { type InvoiceData, type InvoiceItem } from '@/components/invoice/EnterpriseInvoice';

interface BillingCharge {
  id: string; type: string; amount: number; currency: string; description: string;
}

interface Payment {
  id: string; amount: number; currency: string; paymentMethod: string; reference: string; paymentDate: string;
}

interface BillingDetail {
  id: string; status: string; totalAmount: number; currency: string; paidAmount: number; remainingAmount: number;
  billingCharges: BillingCharge[]; payments: Payment[]; createdAt: string; invoicedAt?: string;
  customer?: { name: string; phone: string | null; address: string | null; city: string | null } | null;
  houseAWB?: {
    houseAWBNumber?: string; trackingNumber?: string; chargeableWeight: number; freightRate: number;
    description?: string | null; masterAWB?: { awbNumber: string; shipmentType: string; originStation: { name: string; code: string } } | null;
  } | null;
  exchangeRate: number; exchangeRateDate?: string;
  signedBy?: { name: string; title: string; signatureImage?: string } | null; signedAt?: string;
}

export default function CustomerInvoicePrintPage() {
  const params = useParams();
  const [bill, setBill] = useState<BillingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/customer/invoices/${params.id}`);
        const json = await res.json();
        if (json.success) setBill(json.data);
        else setError(json.error || 'Failed to load');
      } catch { setError('Failed to load'); }
      finally { setIsLoading(false); }
    })();
  }, [params.id]);

  useEffect(() => {
    if (!isLoading && !error && bill && !new URLSearchParams(window.location.search).has('pdf')) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, error, bill]);

  const handleDownload = async () => {
    if (!bill || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/customer/invoices/${bill.id}/pdf`);
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
    } catch { setError('Download failed'); }
    finally { setDownloading(false); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">
        {error || 'Invoice not found'}
      </div>
    );
  }

  const rate = bill.exchangeRate || 2500;
  const cargoDesc = bill.houseAWB?.description || '';
  const hwbTrk = bill.houseAWB?.trackingNumber || bill.houseAWB?.houseAWBNumber || '';
  const mawbNum = bill.houseAWB?.masterAWB?.awbNumber || '';
  const items: InvoiceItem[] = bill.billingCharges.map((c) => ({
    product: cargoDesc ? `${cargoDesc} (${hwbTrk} - ${mawbNum})` : c.description || c.type.replace(/_/g, ' '),
    price: c.amount, qty: 1, total: c.amount,
    priceTsh: c.amount * rate, totalTsh: c.amount * rate,
  }));
  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const subtotalTsh = items.reduce((a, i) => a + (i.totalTsh || 0), 0);
  const tax = subtotal * 0.18;
  const taxTsh = subtotalTsh * 0.18;
  const total = subtotal + tax;
  const totalTsh = subtotalTsh + taxTsh;

  const invoiceData: InvoiceData = {
    invoiceNo: bill.id.slice(0, 8).toUpperCase(),
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
    paymentMethods: [],
    subtotal, tax, taxRate: 18, total,
    exchangeRate: rate, subtotalTsh, taxTsh, totalTsh,
    terms: 'Payment is due upon receipt. Late fee of 2% per month applies.',
    managerName: '', managerTitle: '',
    exchangeRateDate: bill.exchangeRateDate
      ? new Date(bill.exchangeRateDate).toLocaleDateString('en-GB') : undefined,
    signedByName: bill.signedBy?.name || undefined,
    signedByTitle: bill.signedBy?.title || undefined,
    signedByImage: bill.signedBy?.signatureImage || undefined,
    signedAt: bill.signedAt ? new Date(bill.signedAt).toLocaleDateString('en-GB') : undefined,
    status: bill.status,
  };

  return (
    <div className="print:bg-white print:p-0">
      <div className="print:hidden mx-auto max-w-[210mm] p-4">
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </div>
      </div>
      <EnterpriseInvoice data={invoiceData} hideActions colors={{ primary: '#d00020', secondary: '#100030', accent: '#F5F5F5' }} />
    </div>
  );
}
