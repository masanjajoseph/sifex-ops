"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
  exchangeRateDate?: string;
  signedBy?: { name: string; title: string; signatureImage?: string } | null;
  signedAt?: string;
}

export default function BillingPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [bill, setBill] = useState<BillingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    fetch(`/api/billing/${id}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setBill(j.data); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && bill) {
      const urlParams = new URLSearchParams(window.location.search);
      const isPdf = urlParams.has("pdf");
      if (isPdf) {
        setShowPdf(true);
      } else {
        const timer = setTimeout(() => window.print(), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, bill]);

  const handleDownload = useCallback(async () => {
    if (!bill || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoice/${id}/pdf`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SIFEX-INVOICE-${id.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download error:", e);
    } finally {
      setDownloading(false);
    }
  }, [bill, id, downloading]);

  if (loading || !bill) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">Loading invoice...</p>
      </div>
    );
  }

  const rate = bill.exchangeRate || 2500;
  const items: InvoiceItem[] = bill.billingCharges.map((c) => ({
    product: c.description || c.type.replace(/_/g, " "),
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
  const invNum = id.slice(0, 8).toUpperCase();

  const invoiceData: InvoiceData = {
    invoiceNo: invNum,
    invoiceDate: bill.invoicedAt
      ? new Date(bill.invoicedAt).toLocaleDateString("en-GB")
      : new Date(bill.createdAt).toLocaleDateString("en-GB"),
    accountNo: bill.houseAWB?.houseAWBNumber || "-",
    company: {
      name: "Sifex Air Cargo",
      logo: "",
      address: "Dar es Salaam, Tanzania",
      phone: "+255 688 930 963 (Mobile)",
      email: "info@sifex.co.tz",
      website: "www.sifex.co.tz",
    },
    customer: {
      name: bill.customer?.name || "N/A",
      address: [bill.customer?.address, bill.customer?.city].filter(Boolean).join(", ") || "N/A",
      phone: bill.customer?.phone || "N/A",
    },
    items,
    paymentMethods:
      bill.payments.length > 0
        ? bill.payments.map((p) => p.paymentMethod.replace(/_/g, " "))
        : ["Bank Transfer", "Lipa Namba", "Mobile Money", "Card"],
    subtotal,
    tax: taxTsh,
    taxRate: 18,
    total: totalTsh,
    exchangeRate: rate,
    exchangeRateDate: bill.exchangeRateDate
      ? new Date(bill.exchangeRateDate).toLocaleDateString("en-GB")
      : undefined,
    subtotalTsh,
    taxTsh,
    totalTsh,
    terms: "Payment is due upon receipt. Late fee of 2% per month applies.",
    managerName: session?.user?.name || "",
    managerTitle: session?.user?.positionName || "",
    signedByName: bill.signedBy?.name || undefined,
    signedByTitle: bill.signedBy?.title || undefined,
    signedByImage: bill.signedBy?.signatureImage || undefined,
    signedAt: bill.signedAt ? new Date(bill.signedAt).toLocaleDateString("en-GB") : undefined,
    status: bill.status,
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="mx-auto max-w-[210mm] p-4 print:p-0">
        <div className="mb-4 flex justify-center gap-3 print:hidden">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-md bg-[#d00020] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {downloading ? "Downloading\u2026" : "Download PDF"}
          </button>
        </div>
        <div ref={invoiceRef}>
          <EnterpriseInvoice
            data={invoiceData}
            hideActions
            colors={{ primary: "#d00020", secondary: "#100030", accent: "#F5F5F5" }}
          />
        </div>
      </div>
    </div>
  );
}
