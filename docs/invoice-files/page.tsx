"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EnterpriseInvoice, { type InvoiceData, type InvoiceItem } from "@/components/invoice/EnterpriseInvoice";

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
  status: string;
  totalAmount: number;
  currency: string;
  paidAmount: number;
  remainingAmount: number;
  billingCharges: BillingCharge[];
  payments: Payment[];
  createdAt: string;
  invoicedAt?: string;
  customer?: CustomerInfo | null;
  houseAWB?: {
    houseAWBNumber: string;
    chargeableWeight: number;
    freightRate: number;
    shipper: CustomerInfo;
    masterAWB?: { awbNumber: string; shipmentType: string; originStation: { name: string; code: string } } | null;
  } | null;
  exchangeRate: number;
}

export default function BillingPrintPage() {
  const params = useParams();
  const [bill, setBill] = useState<BillingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/billing/${params.id}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setBill(j.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!loading && bill) {
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.has('pdf')) {
        setTimeout(() => window.print(), 300);
      }
    }
  }, [loading, bill]);

  if (loading || !bill) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-500">Loading invoice...</p>
      </div>
    );
  }

  const items: InvoiceItem[] = bill.billingCharges.map((c) => ({
    product: c.description || c.type.replace(/_/g, " "),
    price: c.amount,
    qty: 1,
    total: c.amount,
  }));
  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;
  const invNum = bill.id.slice(0, 8).toUpperCase();

  const invoiceData: InvoiceData = {
    invoiceNo: invNum,
    invoiceDate: bill.invoicedAt
      ? new Date(bill.invoicedAt).toLocaleDateString('en-GB')
      : new Date(bill.createdAt).toLocaleDateString('en-GB'),
    accountNo: bill.houseAWB?.houseAWBNumber || '-',
    company: {
      name: 'LOGO HERE',
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
    terms: 'Payment is due upon receipt. Late fee of 2% per month applies. All charges billed in USD.',
    managerName: 'Masanja Joseph',
    managerTitle: 'General Manager',
  };

  return <EnterpriseInvoice data={invoiceData} hideActions />;
}
