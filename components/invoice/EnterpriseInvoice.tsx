'use client';

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export interface Company {
  name: string;
  logo?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  signatureImage?: string;
}

export interface Customer {
  name: string;
  address: string;
  phone: string;
}

export interface InvoiceItem {
  product: string;
  price: number;
  qty: number;
  total: number;
  priceTsh?: number;
  totalTsh?: number;
}

export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  accountNo: string;
  company: Company;
  customer: Customer;
  items: InvoiceItem[];
  paymentMethods: string[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  terms: string;
  managerName: string;
  managerTitle: string;
  exchangeRate?: number;
  exchangeRateDate?: string;
  subtotalTsh?: number;
  taxTsh?: number;
  totalTsh?: number;
  signedByName?: string;
  signedByTitle?: string;
  signedByImage?: string;
  signedAt?: string;
  status?: string;
}

const defaultData: InvoiceData = {
  invoiceNo: '12345-10',
  invoiceDate: '20-04-2025',
  accountNo: '01234',
  company: {
    name: 'Sifex Air Cargo',
    logo: '',
    address: 'Dar es Salaam, Tanzania',
    phone: '+255 688 930 963 (Mobile)',
    email: 'info@sifex.co.tz',
    website: 'www.sifex.co.tz',
  },
  customer: {
    name: 'Gillbert Johnson',
    address: 'Street Avenue 10019 Miami, FL',
    phone: '(+00) 1234 5678 (Mobile)',
  },
  items: [
    { product: 'Logo Design', price: 0, qty: 0, total: 0 },
    { product: 'Brand identity', price: 0, qty: 0, total: 0 },
  ],
  paymentMethods: ['Bank Transfer', 'Lipa Namba', 'Mobile Money', 'Card'],
  subtotal: 0,
  tax: 0,
  taxRate: 18,
  total: 0,
  terms:
    'Payment is due upon receipt. Late fee of 2% per month applies.',
  managerName: 'Signed',
  managerTitle: '',
  exchangeRate: undefined,
  exchangeRateDate: undefined,
  subtotalTsh: undefined,
  taxTsh: undefined,
  totalTsh: undefined,
  signedByName: undefined,
  signedByTitle: undefined,
  signedByImage: undefined,
  signedAt: undefined,
};

export interface InvoiceColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface EnterpriseInvoiceProps {
  data?: InvoiceData;
  hideActions?: boolean;
  colors?: InvoiceColors;
}

const FALLBACK_LOGO = '/logo.png';

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  PAID: { label: 'PAID', bg: '#16a34a', text: '#fff' },
  CREDITED: { label: 'CREDITED', bg: '#2563eb', text: '#fff' },
  WAITING_PAYMENT: { label: 'UNPAID', bg: '#ea580c', text: '#fff' },
  UNPAID: { label: 'UNPAID', bg: '#ea580c', text: '#fff' },
  DRAFT: { label: 'DRAFT', bg: '#6b7280', text: '#fff' },
  PARTIAL_PAID: { label: 'PARTIAL', bg: '#ca8a04', text: '#fff' },
  REFUNDED: { label: 'REFUNDED', bg: '#dc2626', text: '#fff' },
  NOT_BILLED: { label: 'NOT BILLED', bg: '#6b7280', text: '#fff' },
  INVOICED: { label: 'INVOICED', bg: '#0891b2', text: '#fff' },
};

const EnterpriseInvoice: React.FC<EnterpriseInvoiceProps> = ({
  data = defaultData,
  hideActions = false,
  colors = { primary: '#d00020', secondary: '#100030', accent: '#F5F5F5' },
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  const reactToPrintFn = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Invoice',
  });

  const {
    invoiceNo,
    invoiceDate,
    accountNo,
    company,
    customer,
    items,
    paymentMethods,
    subtotal,
    tax,
    total,
    terms,
    managerName,
    managerTitle,
    exchangeRate,
    exchangeRateDate,
    subtotalTsh,
    totalTsh,
    signedByName,
    signedByTitle,
    signedByImage,
    signedAt,
    status,
  } = data;

  const handleLogoError = () => {
    if (logoRef.current) {
      logoRef.current.style.display = 'none';
      const fb = logoRef.current.nextElementSibling as HTMLElement | null;
      if (fb) fb.style.display = 'flex';
    }
  };

  const statusCfg = status ? STATUS_STYLES[status] || { label: status, bg: '#6b7280', text: '#fff' } : null;

  return (
    <div className="invoice-root flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      {!hideActions && (
        <div className="flex gap-4 mb-6 print:hidden">
          <button
            onClick={reactToPrintFn}
            className="px-6 py-2 text-white rounded-md hover:opacity-90 transition"
            style={{ backgroundColor: colors.primary }}
          >
            Print / PDF
          </button>
        </div>
      )}

      <div
        ref={componentRef}
        className="w-[210mm] min-h-[297mm] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] print:shadow-none relative overflow-hidden"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {/* ──────────────── DECORATIVE BACKGROUND SHAPES ──────────────── */}
        <svg
          className="absolute top-0 right-0 w-[520px] h-[520px]"
          viewBox="0 0 520 520"
          fill="none"
          style={{ zIndex: 0 }}
        >
          <defs>
            <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
          </defs>
          <circle cx="380" cy="130" r="320" fill="url(#bannerGrad)" opacity="0.08" />
          <circle cx="460" cy="60" r="200" fill={colors.primary} opacity="0.06" />
        </svg>

        <svg
          className="absolute top-[-60px] right-[-60px] w-[300px] h-[300px]"
          viewBox="0 0 300 300"
          fill="none"
          style={{ zIndex: 0 }}
        >
          <circle cx="150" cy="150" r="150" fill={colors.secondary} opacity="0.12" />
        </svg>

        <svg
          className="absolute top-[40px] right-[20px] w-[100px] h-[100px]"
          viewBox="0 0 100 100"
          fill="none"
          style={{ zIndex: 0 }}
        >
          <circle cx="50" cy="50" r="50" fill={colors.accent} opacity="0.35" />
        </svg>

        <svg
          className="absolute top-[160px] right-[220px] w-[130px] h-[130px]"
          viewBox="0 0 130 130"
          fill="none"
          style={{ zIndex: 0 }}
        >
          <path d="M0 0H130V130C130 58.2 71.8 0 0 0Z" fill={colors.secondary} opacity="0.08" />
        </svg>

        <svg
          className="absolute top-[10px] right-[160px] w-[50px] h-[50px]"
          viewBox="0 0 50 50"
          fill="none"
          style={{ zIndex: 0 }}
        >
          <circle cx="25" cy="25" r="25" fill={colors.primary} opacity="0.08" />
        </svg>

        {/* ──────────────── TOP-RIGHT BANNER ──────────────── */}
        <div
          className="absolute top-0 right-0"
          style={{
            width: '58%',
            height: '150px',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            borderBottomLeftRadius: '70px',
            zIndex: 1,
          }}
        />

        <svg
          className="absolute top-[10px] right-[30px]"
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          style={{ zIndex: 2 }}
        >
          <circle cx="40" cy="40" r="40" fill={colors.accent} opacity="0.1" />
          <circle cx="40" cy="40" r="20" fill={colors.accent} opacity="0.15" />
        </svg>

        <svg
          className="absolute top-[120px] right-[80px]"
          width="60"
          height="60"
          viewBox="0 0 60 60"
          fill="none"
          style={{ zIndex: 2 }}
        >
          <circle cx="30" cy="30" r="30" fill={colors.secondary} opacity="0.15" />
          <circle cx="30" cy="30" r="12" fill={colors.accent} opacity="0.2" />
        </svg>

        {/* dots scattered in banner area */}
        <svg
          className="absolute top-[50px] right-[260px]"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ zIndex: 2 }}
        >
          <circle cx="4" cy="4" r="2" fill={colors.accent} opacity="0.3" />
          <circle cx="12" cy="4" r="2" fill={colors.accent} opacity="0.2" />
          <circle cx="20" cy="4" r="2" fill={colors.accent} opacity="0.25" />
          <circle cx="8" cy="12" r="2" fill={colors.accent} opacity="0.15" />
          <circle cx="16" cy="12" r="2" fill={colors.accent} opacity="0.3" />
          <circle cx="4" cy="20" r="2" fill={colors.accent} opacity="0.2" />
          <circle cx="12" cy="20" r="2" fill={colors.accent} opacity="0.25" />
          <circle cx="20" cy="20" r="2" fill={colors.accent} opacity="0.15" />
        </svg>

        {/* ──────────────── HEADER: LOGO + INVOICE ──────────────── */}
        <div className="relative z-10 flex justify-between items-start px-10 pt-8">
          <div className="flex items-center gap-3">
            <div className="relative w-[120px] h-[70px]">
              <img
                ref={logoRef}
                src={company.logo || FALLBACK_LOGO}
                alt="Logo"
                className="max-h-full max-w-full object-contain"
                onError={handleLogoError}
              />
              <div
                className="hidden absolute inset-0 items-center justify-center text-xs font-bold text-gray-500 border border-gray-300 bg-gray-200"
              >
                LOGO HERE
              </div>
            </div>
          </div>

          <div className="relative flex items-start gap-3 pr-6 pt-2" style={{ zIndex: 5 }}>
            <h1
              className="text-4xl font-black tracking-[0.15em] uppercase"
              style={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            >
              INVOICE
            </h1>
            {statusCfg && (
              <span
                className="inline-block rounded-md px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase shadow-md"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}
              >
                {statusCfg.label}
              </span>
            )}
          </div>
        </div>

        {/* ──────────────── INVOICE TO + METADATA ──────────────── */}
        <div className="relative z-10 flex justify-between px-10 mt-20">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: colors.primary }}>
              Invoice To:
            </p>
            <p className="text-lg font-bold text-gray-900">{customer.name}</p>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <span className="mt-0.5 text-[8px]" style={{ color: colors.primary }}>●</span>
              <span>{customer.address}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <span className="mt-0.5 text-[8px]" style={{ color: colors.primary }}>●</span>
              <span>{customer.phone}</span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <p className="text-sm">
              <span className="font-semibold text-gray-500">Invoice No:</span>{' '}
              <span className="font-bold text-lg" style={{ color: colors.primary }}>{invoiceNo}</span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-500">Invoice Date:</span>{' '}
              <span className="font-bold" style={{ color: colors.primary }}>{invoiceDate}</span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-gray-500">Account No:</span>{' '}
              <span className="font-bold" style={{ color: colors.primary }}>{accountNo}</span>
            </p>
          </div>
        </div>

        {/* ──────────────── BODY: PAYMENT SIDEBAR + TABLE ──────────────── */}
        <div className="relative z-10 flex px-10 mt-8 gap-6">
          {/* Payment Methods Sidebar */}
          <div className="w-[180px] flex-shrink-0">
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: colors.accent, border: `1px solid ${colors.primary}15` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: colors.primary }}>
                Payment Method
              </p>
              {paymentMethods.map((method, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <span className="text-gray-700 font-medium text-xs">{method}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table + Totals */}
          <div className="flex-1 min-w-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr
                  className="border-b-2"
                  style={{ borderColor: colors.primary }}
                >
                  <th
                    className="text-left py-2.5 font-bold uppercase tracking-wider text-xs"
                    style={{ color: colors.primary }}
                  >
                    PRODUCT
                  </th>
                  <th
                    className="text-right py-2.5 font-bold uppercase tracking-wider text-xs"
                    style={{ color: colors.primary }}
                  >
                    PRICE (USD)
                  </th>
                  <th
                    className="text-right py-2.5 font-bold uppercase tracking-wider text-xs"
                    style={{ color: colors.primary }}
                  >
                    PRICE (TZS)
                  </th>
                  <th
                    className="text-right py-2.5 font-bold uppercase tracking-wider text-xs"
                    style={{ color: colors.primary }}
                  >
                    QTY
                  </th>
                  <th
                    className="text-right py-2.5 font-bold uppercase tracking-wider text-xs"
                    style={{ color: colors.primary }}
                  >
                    TOTAL (TZS)
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-700 font-medium">{item.product}</td>
                    <td className="py-2.5 text-right text-gray-600">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right text-gray-700 font-medium">
                      {(item.priceTsh ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right text-gray-600">{item.qty}</td>
                    <td className="py-2.5 text-right text-gray-800 font-bold">
                      {(item.totalTsh ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Terms + Totals */}
            <div className="flex justify-between mt-6 gap-8">
              <div className="flex-1">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5"
                  style={{ color: colors.primary }}
                >
                  Terms &amp; Conditions
                </p>
                <p className="text-xs text-gray-500 leading-relaxed max-w-[280px]">{terms}</p>
              </div>

              <div className="w-[230px] flex-shrink-0">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">SUB TOTAL (USD)</span>
                    <span className="font-bold text-gray-800">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">SUB TOTAL (TZS)</span>
                    <span className="font-bold text-gray-800">
                      {(subtotalTsh ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                    <span className="text-gray-500">TAX (18%)</span>
                    <span className="font-bold text-gray-800">
                      {(tax ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {exchangeRate && (
                    <div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-1">
                      <span>Exchange Rate{exchangeRateDate ? ` (${exchangeRateDate})` : ''}</span>
                      <span>1 USD = {exchangeRate.toLocaleString('en-US')} TZS</span>
                    </div>
                  )}
                  <div
                    className="flex justify-between text-lg font-black pt-2 mt-1 border-t-2"
                    style={{ borderColor: colors.primary, color: colors.primary }}
                  >
                    <span>TOTAL (TZS)</span>
                    <span>
                      {(totalTsh ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ──────────────── SIGNATURE ──────────────── */}
        <div className="relative z-10 flex justify-between items-end px-10 mt-10">
          <div className="flex-1 max-w-[250px]">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
              style={{ color: colors.primary }}
            >
              {signedByName ? `Signed${signedAt ? ` on ${signedAt}` : ''}` : 'Digitally Signed'}
            </p>
            <div
              className="w-full border-b-2 pt-1 mb-1"
              style={{ borderColor: colors.primary }}
            />
            {signedByImage ? (
              <img src={signedByImage} alt="Signature" className="h-10 object-contain -mt-1" />
            ) : company.signatureImage ? (
              <img src={company.signatureImage} alt="Signature" className="h-10 object-contain -mt-1" />
            ) : (
              <svg className="w-[90px] h-[32px] -mt-1" viewBox="0 0 90 32" fill="none">
                <path
                  d="M6 16 Q16 2 26 16 Q36 30 46 16 Q56 2 66 12 Q72 6 84 14"
                  stroke={colors.primary}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M12 22 Q22 8 32 22 Q42 36 52 22 Q62 8 72 18"
                  stroke={colors.primary}
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <p className="text-sm font-bold text-gray-800 mt-1.5">{signedByName || managerName || ''}</p>
            <p className="text-xs text-gray-500">{signedByTitle || managerTitle || ''}</p>
          </div>
        </div>

        {/* ──────────────── FOOTER ──────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[90px]"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            borderTopRightRadius: '70px',
            zIndex: 1,
          }}
        />

        {/* footer decorative shapes */}
        <svg
          className="absolute bottom-0 left-0"
          width="160"
          height="90"
          viewBox="0 0 160 90"
          fill="none"
          style={{ zIndex: 2 }}
        >
          <circle cx="20" cy="60" r="50" fill={colors.secondary} opacity="0.2" />
          <circle cx="60" cy="75" r="25" fill={colors.accent} opacity="0.15" />
          <rect x="100" y="45" width="35" height="35" rx="8" fill={colors.secondary} opacity="0.1" />
        </svg>

        <svg
          className="absolute bottom-0 right-[50px]"
          width="100"
          height="90"
          viewBox="0 0 100 90"
          fill="none"
          style={{ zIndex: 2 }}
        >
          <circle cx="80" cy="70" r="40" fill={colors.accent} opacity="0.1" />
          <circle cx="45" cy="65" r="15" fill={colors.secondary} opacity="0.2" />
          <circle cx="15" cy="75" r="6" fill={colors.accent} opacity="0.2" />
        </svg>

        {/* footer dot pattern */}
        <svg
          className="absolute bottom-[30px] right-[180px]"
          width="40"
          height="30"
          viewBox="0 0 40 30"
          fill="none"
          style={{ zIndex: 2 }}
        >
          <circle cx="4" cy="4" r="2" fill={colors.accent} opacity="0.2" />
          <circle cx="16" cy="4" r="2" fill={colors.accent} opacity="0.15" />
          <circle cx="28" cy="4" r="2" fill={colors.accent} opacity="0.2" />
          <circle cx="10" cy="16" r="2" fill={colors.accent} opacity="0.15" />
          <circle cx="22" cy="16" r="2" fill={colors.accent} opacity="0.2" />
          <circle cx="34" cy="16" r="2" fill={colors.accent} opacity="0.15" />
        </svg>

        <div
          className="absolute bottom-0 left-0 right-0 h-[90px] flex items-center justify-between px-10"
          style={{ zIndex: 5 }}
        >
          <div className="flex items-center gap-6 text-xs text-white/90">
            <span className="font-medium">{company.phone.replace(/[^0-9+]/g, '')}</span>
            <span className="opacity-40">|</span>
            <span>{company.email}</span>
            <span className="opacity-40">|</span>
            <span>{company.website}</span>
          </div>
          <div className="text-xs text-white/60">
            &copy; {new Date().getFullYear()} {company.name}
          </div>
        </div>
      </div>

      <style>{`
        .invoice-bg-primary { background-color: ${colors.primary}; }
        .invoice-text-primary { color: ${colors.primary}; }
        .invoice-border-primary { border-color: ${colors.primary}; }
        .invoice-bg-secondary { background-color: ${colors.secondary}; }
        .invoice-text-secondary { color: ${colors.secondary}; }
        .invoice-bg-accent { background-color: ${colors.accent}; }
        .invoice-text-accent { color: ${colors.accent}; }
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-root {
            padding: 0 !important;
            background: white !important;
            min-height: auto !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .min-h-screen {
            min-height: auto !important;
          }
          .bg-gray-100 {
            background: white !important;
          }
          .p-4 {
            padding: 0 !important;
          }
          .mb-6 {
            margin-bottom: 0 !important;
          }
          .gap-4 {
            gap: 0 !important;
          }
          .flex-col {
            flex-direction: column !important;
          }
          .items-center {
            align-items: stretch !important;
          }
          .w-\\[210mm\\] {
            width: 100% !important;
            max-width: 210mm !important;
          }
          .min-h-\\[297mm\\] {
            min-height: 100vh !important;
          }
          .shadow-\\[0_8px_30px_rgba\\(0\\,0\\,0\\,0\\.12\\)\\] {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EnterpriseInvoice;
