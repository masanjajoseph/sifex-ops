"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
  customer?: CustomerInfo | null;
  houseAWB?: {
    houseAWBNumber: string;
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

const P = "#d00020";
const A = "#100030";
const L = "#F5F5F5";

export default function BillingPrintPage() {
  const params = useParams();
  const [bill, setBill] = useState<BillingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/billing/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setBill(j.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!loading && bill) {
      setTimeout(() => window.print(), 300);
    }
  }, [loading, bill]);

  if (loading || !bill) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-500">Loading invoice...</p>
      </div>
    );
  }

  const items = bill.billingCharges.map((c) => ({
    description: c.description || c.type.replace(/_/g, " "),
    price: c.amount,
    qty: 1,
    total: c.amount,
  }));

  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;
  const totalTzs = total * bill.exchangeRate;
  const invNum = bill.id.slice(0, 8).toUpperCase();

  return (
    <div className="invoice-container">
      <style>{`
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 210mm; min-height: 297mm; background: #fff; font-family: 'Helvetica', Arial, sans-serif; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .invoice-container { width: 210mm; min-height: 297mm; overflow: hidden; background: #fff; position: relative; page-break-inside: avoid; }
        @media print {
          html, body { width: 210mm; height: 297mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-container { width: 210mm; min-height: 297mm; overflow: hidden; page-break-inside: avoid; }
        }
      `}</style>

      {/* ─── DECORATIVE SVG TOP-RIGHT ─── */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 220, height: 220, overflow: "hidden", pointerEvents: "none" }}>
        <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M220 220C220 98.5 121.5 0 0 0H220V220Z" fill={P} opacity="0.04" />
          <path d="M220 180C220 80.6 139.4 0 40 0H220V180Z" fill={P} opacity="0.06" />
          <path d="M220 140C220 62.7 157.3 0 80 0H220V140Z" fill={A} opacity="0.08" />
          <circle cx="180" cy="40" r="30" fill={A} opacity="0.12" />
          <circle cx="200" cy="80" r="15" fill={A} opacity="0.1" />
          <circle cx="160" cy="20" r="8" fill={P} opacity="0.15" />
          <circle cx="210" cy="110" r="6" fill={A} opacity="0.2" />
          <circle cx="190" cy="140" r="4" fill={A} opacity="0.15" />
          <path d="M160 0C170 30 190 40 220 40" stroke={A} strokeWidth="1" fill="none" opacity="0.15" />
          <path d="M180 0C190 20 205 30 220 35" stroke={A} strokeWidth="0.5" fill="none" opacity="0.2" />
        </svg>
      </div>

      {/* ─── DECORATIVE SVG BOTTOM-LEFT ─── */}
      <div style={{ position: "absolute", bottom: 60, left: 0, width: 180, height: 180, overflow: "hidden", pointerEvents: "none" }}>
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 180C0 80.6 80.6 0 180 0V180H0Z" fill={P} opacity="0.04" />
          <path d="M0 140C0 62.7 62.7 0 140 0V140H0Z" fill={A} opacity="0.06" />
          <rect x="0" y="140" width="60" height="40" rx="8" fill={P} opacity="0.05" />
          <rect x="70" y="150" width="40" height="30" rx="6" fill={A} opacity="0.08" />
          <circle cx="30" cy="30" r="20" fill={A} opacity="0.1" />
          <circle cx="60" cy="50" r="10" fill={P} opacity="0.08" />
          <circle cx="120" cy="100" r="6" fill={A} opacity="0.12" />
          <circle cx="150" cy="130" r="4" fill={A} opacity="0.15" />
          <path d="M0 100C30 110 60 105 90 120C120 135 150 130 180 140" stroke={A} strokeWidth="1" fill="none" opacity="0.1" />
        </svg>
      </div>

      {/* ─── DECORATIVE SVG BOTTOM-RIGHT FOOTER ─── */}
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 280, height: 60, overflow: "hidden", pointerEvents: "none" }}>
        <svg width="280" height="60" viewBox="0 0 280 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M280 60C280 26.9 253.1 0 220 0H280V60Z" fill={P} opacity="0.05" />
          <path d="M280 40C280 17.9 262.1 0 240 0H280V40Z" fill={A} opacity="0.07" />
          <path d="M200 60C200 46.9 189.1 40 176 40" stroke={A} strokeWidth="1.5" fill="none" opacity="0.15" />
          <circle cx="250" cy="15" r="8" fill={A} opacity="0.1" />
          <circle cx="265" cy="35" r="5" fill={A} opacity="0.12" />
          <circle cx="235" cy="45" r="3" fill={P} opacity="0.15" />
          <circle cx="270" cy="50" r="2" fill={A} opacity="0.2" />
          <path d="M160 60C170 50 185 45 200 48C215 51 230 45 250 50" stroke={A} strokeWidth="0.8" fill="none" opacity="0.1" />
        </svg>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div style={{ padding: "30px 35px 20px", position: "relative", zIndex: 1, minHeight: "297mm", display: "flex", flexDirection: "column" }}>

        {/* ═══ HEADER ═══ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/logo.png" alt="SIFEX" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8 }}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
                const fb = t.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "flex";
              }} />
            <div style={{ display: "none", width: 56, height: 56, borderRadius: 8, background: P, alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 700 }}>S</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: P, letterSpacing: 1 }}>SIFEX COURIER SERVICES COMPANY LTD</div>
              <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>International Shipping & Logistics</div>
              <div style={{ fontSize: 8, color: "#aaa", marginTop: 1 }}>Dar es Salaam, Tanzania | info@sifex.co.tz</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              display: "inline-block",
              background: `linear-gradient(135deg, ${P}, #0a0020)`,
              borderRadius: 10,
              padding: "8px 22px",
              boxShadow: "0 4px 14px rgba(16,0,48,0.25)"
            }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 2 }}>Invoice</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: 3 }}>{invNum}</div>
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{
                display: "inline-block",
                padding: "3px 14px",
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                background: bill.status === "PAID" || bill.status === "paid" ? "#d4edda" : bill.status === "CREDITED" || bill.status === "credited" ? "#cce5ff" : "#fff3cd",
                color: bill.status === "PAID" || bill.status === "paid" ? "#155724" : bill.status === "CREDITED" || bill.status === "credited" ? "#004085" : "#856404",
              }}>
                {(bill.status === "PAID" || bill.status === "paid") ? "PAID" : (bill.status === "CREDITED" || bill.status === "credited") ? "CREDITED" : "UNPAID"}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ CUSTOMER + INVOICE INFO ═══ */}
        <div style={{ display: "flex", gap: 30, marginBottom: 22 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P, marginBottom: 6 }}>Invoice To</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#222", marginBottom: 3 }}>{bill.customer?.name || "N/A"}</div>
            {bill.customer?.address && <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>{bill.customer.address}</div>}
            {bill.customer?.city && <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>{bill.customer.city}</div>}
            {bill.customer?.phone && <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>Phone: {bill.customer.phone}</div>}
            {bill.customer?.email && <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>Email: {bill.customer.email}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P, marginBottom: 6 }}>Invoice Details</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Invoice Number", invNum],
                  ["Invoice Date", bill.invoicedAt ? new Date(bill.invoicedAt).toLocaleDateString() : new Date(bill.createdAt).toLocaleDateString()],
                  ["Account Number", bill.houseAWB?.houseAWBNumber || "-"],
                  ["MAWB", bill.houseAWB?.masterAWB?.awbNumber || "-"],
                  ["Origin", bill.houseAWB?.masterAWB?.originStation?.code || "-"],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ fontSize: 9, color: "#888", padding: "2px 8px 2px 0", whiteSpace: "nowrap", width: 1 }}>{label}</td>
                    <td style={{ fontSize: 10, color: "#333", padding: "2px 0", fontWeight: 600 }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ BODY: TWO-COLUMN ═══ */}
        <div style={{ display: "flex", gap: 22, flex: 1 }}>
          {/* LEFT SIDEBAR */}
          <div style={{ width: 190, flexShrink: 0 }}>
            <div style={{ background: L, borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P, marginBottom: 10 }}>Payment Methods</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#333", marginBottom: 4 }}>Bank Transfer</div>
                <div style={{ fontSize: 8.5, color: "#666", lineHeight: 1.6 }}>
                  CRDB: 0151234567890<br />
                  NMB: 41234567890<br />
                  NBC: 011234567890
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#333", marginBottom: 4 }}>Lipa Namba</div>
                <div style={{ fontSize: 8.5, color: "#666", lineHeight: 1.6 }}>
                  CRDB Lipa Hapa: 451234<br />
                  NMB Lipa: 561234<br />
                  NBC Lipa: 671234<br />
                  Vodacom Lipa: 123456<br />
                  Tigo Lipa: 234567<br />
                  Airtel Lipa: 345678
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#333", marginBottom: 4 }}>Mobile Money</div>
                <div style={{ fontSize: 8.5, color: "#666", lineHeight: 1.6 }}>
                  M-Pesa<br />
                  TigoPesa<br />
                  AirtelMoney<br />
                  HaloPesa
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#333", marginBottom: 4 }}>Card</div>
                <div style={{ fontSize: 8.5, color: "#666" }}>Pay via EvPay checkout link</div>
              </div>
            </div>
            <div style={{ background: L, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P, marginBottom: 8 }}>Terms & Conditions</div>
              <div style={{ fontSize: 8.5, color: "#666", lineHeight: 1.7 }}>
                Payment is due upon receipt of this invoice. A late fee of 2% per month may be applied to overdue balances. All charges are billed in USD; TZS equivalent is provided for reference at the prevailing exchange rate.
              </div>
            </div>
          </div>

          {/* RIGHT TABLE */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Description", "Price", "Qty", "Total"].map((h) => (
                    <th key={h} style={{
                      background: P,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      padding: "10px 10px",
                      textAlign: h === "Price" || h === "Qty" || h === "Total" ? "right" : "left",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 10, padding: "9px 10px", borderBottom: "1px solid #eee", color: "#333" }}>{item.description}</td>
                    <td style={{ fontSize: 10, padding: "9px 10px", borderBottom: "1px solid #eee", textAlign: "right", color: "#333" }}>${item.price.toFixed(2)}</td>
                    <td style={{ fontSize: 10, padding: "9px 10px", borderBottom: "1px solid #eee", textAlign: "right", color: "#333" }}>{item.qty}</td>
                    <td style={{ fontSize: 10, padding: "9px 10px", borderBottom: "1px solid #eee", textAlign: "right", color: "#333" }}>${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* TOTALS */}
            <div style={{ marginLeft: "auto", width: 250, marginTop: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: 10, padding: "4px 10px", color: "#666" }}>Subtotal</td>
                    <td style={{ fontSize: 10, padding: "4px 10px", textAlign: "right", color: "#333" }}>${subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 10, padding: "4px 10px", color: "#666" }}>Tax (18%)</td>
                    <td style={{ fontSize: 10, padding: "4px 10px", textAlign: "right", color: "#333" }}>${tax.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 14, fontWeight: 700, padding: "8px 10px", color: P, borderTop: `2px solid ${P}` }}>TOTAL</td>
                    <td style={{ fontSize: 14, fontWeight: 700, padding: "8px 10px", textAlign: "right", color: P, borderTop: `2px solid ${P}` }}>${total.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 9, padding: "2px 10px", color: "#888" }}>TZS Equivalent</td>
                    <td style={{ fontSize: 9, padding: "2px 10px", textAlign: "right", color: "#888" }}>TZS {totalTzs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ fontSize: 8, padding: "1px 10px", color: "#aaa", textAlign: "right" }}>Rate: 1 USD = {bill.exchangeRate} TZS</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PAYMENT HISTORY */}
            {bill.payments.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P, marginBottom: 6 }}>Payment History</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Date", "Method", "Reference", "Amount"].map((h) => (
                        <th key={h} style={{ background: "#f0f0f0", fontSize: 8, fontWeight: 600, textTransform: "uppercase", padding: "6px 8px", textAlign: h === "Amount" ? "right" : "left", color: "#666" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bill.payments.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontSize: 9, padding: "5px 8px", borderBottom: "1px solid #eee", color: "#555" }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td style={{ fontSize: 9, padding: "5px 8px", borderBottom: "1px solid #eee", color: "#555" }}>{p.paymentMethod.replace(/_/g, " ")}</td>
                        <td style={{ fontSize: 9, padding: "5px 8px", borderBottom: "1px solid #eee", color: "#555" }}>{p.reference || "-"}</td>
                        <td style={{ fontSize: 9, padding: "5px 8px", borderBottom: "1px solid #eee", textAlign: "right", color: "#555" }}>{p.currency} {p.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{ marginTop: "auto", paddingTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P, marginBottom: 8 }}>Manager Signature</div>
              <div style={{ width: 200, height: 1, background: "#ccc", marginBottom: 6 }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>Masanja Joseph</div>
              <div style={{ fontSize: 9, color: "#888" }}>General Manager</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, color: "#aaa" }}>Invoice #{invNum}</div>
              <div style={{ fontSize: 8, color: "#aaa" }}>Generated {new Date().toLocaleString()}</div>
            </div>
          </div>

          {/* BOTTOM DARK STRIP */}
          <div style={{
            background: `linear-gradient(135deg, ${P}, #0a0020)`,
            borderRadius: 8,
            padding: "10px 20px",
            display: "flex",
            justifyContent: "center",
            gap: 40,
            margin: "0 -5px",
          }}>
            {[
              ["Phone", "+255 688 930 963"],
              ["Email", "info@sifex.co.tz"],
              ["Website", "www.sifex.co.tz"],
            ].map(([l, v]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 7, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                <div style={{ fontSize: 9, color: "#fff", fontWeight: 600, marginTop: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
