"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, CreditCard, Smartphone, Building2, Banknote, ArrowRight } from "lucide-react";

type PaymentStep = "methods" | "card" | "mobile" | "lipanamba" | "bank" | "cash" | "processing" | "done";

interface BillingDetail {
  id: string;
  totalAmount: number;
  currency: string;
  status: string;
  customer?: { name: string; phone: string | null; email: string | null } | null;
  houseAWB?: { houseAWBNumber: string } | null;
  exchangeRate: number;
}

const MNO_NETWORKS = [
  { value: "Mpesa", label: "M-Pesa" },
  { value: "TigoPesa", label: "Tigo Pesa" },
  { value: "AirtelMoney", label: "Airtel Money" },
  { value: "HaloPesa", label: "Halo Pesa" },
];

const LIPA_NETWORKS = [
  { value: "CRDB", label: "CRDB Lipa Hapa", number: "451234" },
  { value: "NMB", label: "NMB Lipa", number: "561234" },
  { value: "NBC", label: "NBC Lipa", number: "671234" },
  { value: "Vodacom", label: "Vodacom Lipa Namba", number: "123456" },
  { value: "Tigo", label: "Tigo Lipa Namba", number: "234567" },
  { value: "Airtel", label: "Airtel Lipa Namba", number: "345678" },
];

const BANKS = [
  { value: "CRDB", label: "CRDB Bank", account: "0151234567890", name: "SIFEX COURIER SERVICES COMPANY LTD" },
  { value: "NMB", label: "NMB Bank", account: "41234567890", name: "SIFEX COURIER SERVICES COMPANY LTD" },
  { value: "NBC", label: "NBC Bank", account: "011234567890", name: "SIFEX COURIER SERVICES COMPANY LTD" },
  { value: "EQUITY", label: "Equity Bank", account: "3101234567890", name: "SIFEX COURIER SERVICES COMPANY LTD" },
];

export default function PaymentInvoicePage() {
  const params = useParams();
  const [bill, setBill] = useState<BillingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<PaymentStep>("methods");
  const [payMethod, setPayMethod] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [cardAddress, setCardAddress] = useState("");
  const [cardLocality, setCardLocality] = useState("");
  const [cardRegion, setCardRegion] = useState("");
  const [cardPostal, setCardPostal] = useState("");
  const [paid, setPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/billing/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setBill(j.data);
        else setError("Invoice not found");
      })
      .catch(() => setError("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const totalTzs = bill ? bill.totalAmount * bill.exchangeRate : 0;

  const handleCardPay = async () => {
    if (!firstName || !email || !phone || !bill) return;
    setSubmitting(true);
    setStep("processing");
    try {
      const res = await fetch(`/api/payments/evpay/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingId: bill.id,
          firstName,
          lastName,
          email,
          phone,
          address1: cardAddress,
          locality: cardLocality,
          administrativeArea: cardRegion,
          postalCode: cardPostal,
        }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setError("Failed to initiate card payment");
        setStep("card");
      }
    } catch {
      setError("Failed to initiate card payment");
      setStep("card");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMobilePay = async () => {
    if (!phone || !selectedNetwork || !bill) return;
    setSubmitting(true);
    setStep("processing");
    try {
      const res = await fetch(`/api/payments/evpay/mno-charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingId: bill.id,
          mobileNo: phone,
          network: selectedNetwork,
          product: `SIFEX-${bill.houseAWB?.houseAWBNumber || bill.id.slice(0, 8)}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStep("done");
        setPaid(true);
      } else {
        setError(json.error || "Payment failed");
        setStep("mobile");
      }
    } catch {
      setError("Failed to process mobile payment");
      setStep("mobile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-4 dark:bg-gray-950">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  if (!bill) return null;

  if (paid || bill.status === "PAID") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-4 dark:bg-gray-950">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          TZS {totalTzs.toLocaleString()} has been paid.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 dark:bg-gray-950">
      <div className="mx-auto max-w-lg px-4">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">SIFEX Logistics</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Invoice Payment</p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Invoice #</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{bill.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">HAWB</span>
            <span className="text-sm text-gray-900 dark:text-white">{bill.houseAWB?.houseAWBNumber || "-"}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Customer</span>
            <span className="text-sm text-gray-900 dark:text-white">{bill.customer?.name || "-"}</span>
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">TZS {totalTzs.toLocaleString()}</p>
                <p className="text-xs text-gray-400">USD {bill.totalAmount.toLocaleString()} @ {bill.exchangeRate}</p>
              </div>
            </div>
          </div>
        </div>

        {step === "methods" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Choose payment method</p>

            <button onClick={() => setStep("card")} className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Card Payment</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Visa, Mastercard, American Express</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>

            <button onClick={() => setStep("mobile")} className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600">
              <Smartphone className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Mobile Money</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">M-Pesa, Tigo Pesa, Airtel Money, Halo Pesa</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>

            <button onClick={() => setStep("lipanamba")} className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600">
              <Smartphone className="h-6 w-6 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Lipa Namba</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lipa kwa namba ya simu</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>

            <button onClick={() => setStep("bank")} className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600">
              <Building2 className="h-6 w-6 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Bank Transfer</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">CRDB, NMB, NBC, Equity</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>

            <button onClick={() => setStep("cash")} className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600">
              <Banknote className="h-6 w-6 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Cash</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pay at our office</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        )}

        {step === "card" && (
          <div className="space-y-4">
            <button onClick={() => setStep("methods")} className="text-sm text-blue-600 hover:underline dark:text-blue-400">← Back</button>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Card Payment</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">First Name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Last Name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Phone Number</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="255712345678" className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Street Address</label>
                  <input value={cardAddress} onChange={e => setCardAddress(e.target.value)} placeholder="e.g. Mwai Kibaki Rd, Plot 123" className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">City / Town</label>
                  <input value={cardLocality} onChange={e => setCardLocality(e.target.value)} placeholder="e.g. Dar es Salaam" className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Region</label>
                  <input value={cardRegion} onChange={e => setCardRegion(e.target.value)} placeholder="e.g. Dar es Salaam" className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Postal Code</label>
                  <input value={cardPostal} onChange={e => setCardPostal(e.target.value)} placeholder="e.g. 10000" className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <button onClick={handleCardPay} disabled={submitting || !firstName || !email || !phone} className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay TZS ${totalTzs.toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "mobile" && (
          <div className="space-y-4">
            <button onClick={() => setStep("methods")} className="text-sm text-blue-600 hover:underline dark:text-blue-400">← Back</button>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Mobile Money</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Network</label>
                  <select value={selectedNetwork} onChange={e => setSelectedNetwork(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                    <option value="">Select network</option>
                    {MNO_NETWORKS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Phone Number</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="255712345678" className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <button onClick={handleMobilePay} disabled={submitting || !phone || !selectedNetwork} className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay TZS ${totalTzs.toLocaleString()}`}
                </button>
                <p className="text-xs text-gray-400">You will receive a USSD prompt on your phone to confirm payment.</p>
              </div>
            </div>
          </div>
        )}

        {step === "lipanamba" && (
          <div className="space-y-4">
            <button onClick={() => setStep("methods")} className="text-sm text-blue-600 hover:underline dark:text-blue-400">← Back</button>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Lipa Namba</h2>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Choose your network and send payment to the Lipa Namba number shown. After payment, visit our office or contact us to confirm.</p>
              <div className="space-y-3">
                {LIPA_NETWORKS.map(n => (
                  <div key={n.value} className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{n.label}</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{n.number}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Amount: <strong>TZS {totalTzs.toLocaleString()}</strong> | Reference: <strong>{bill.id.slice(0, 8).toUpperCase()}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "bank" && (
          <div className="space-y-4">
            <button onClick={() => setStep("methods")} className="text-sm text-blue-600 hover:underline dark:text-blue-400">← Back</button>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Bank Transfer</h2>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Transfer the amount to any of the following accounts. After payment, visit our office or contact us to confirm.</p>
              <div className="space-y-3">
                {BANKS.map(b => (
                  <div key={b.value} className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{b.label}</p>
                    <p className="text-base font-bold text-amber-600 dark:text-amber-400">{b.account}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.name}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Amount: <strong>TZS {totalTzs.toLocaleString()}</strong> | Reference: <strong>{bill.id.slice(0, 8).toUpperCase()}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "cash" && (
          <div className="space-y-4">
            <button onClick={() => setStep("methods")} className="text-sm text-blue-600 hover:underline dark:text-blue-400">← Back</button>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Cash Payment</h2>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Visit our office to pay in cash. Bring your invoice reference number.
                </p>
                <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Reference:</strong> {bill.id.slice(0, 8).toUpperCase()}</p>
                  <p><strong>Amount:</strong> TZS {totalTzs.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing payment...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Payment initiated successfully</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Follow the USSD prompt on your phone to complete payment.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
