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
}

const defaultData: InvoiceData = {
  invoiceNo: '12345-10',
  invoiceDate: '20-04-2025',
  accountNo: '01234',
  company: {
    name: 'LOGO HERE',
    logo: '',
    address: 'Street Avenue 10019 Miami, FL',
    phone: '(+00) 1234 5678 (Mobile)',
    email: 'studio@company.com',
    website: 'www.company.com',
  },
  customer: {
    name: 'Gillbert Johnson',
    address: 'Street Avenue 10019 Miami, FL',
    phone: '(+00) 1234 5678 (Mobile)',
  },
  items: [
    { product: 'Logo Design', price: 0, qty: 0, total: 0 },
    { product: 'Brand identity', price: 0, qty: 0, total: 0 },
    { product: 'Website design', price: 0, qty: 0, total: 0 },
    { product: 'Stationery design', price: 0, qty: 0, total: 0 },
    { product: 'Website design', price: 0, qty: 0, total: 0 },
  ],
  paymentMethods: ['Bank Account', 'Paypal', 'Master Card'],
  subtotal: 0,
  tax: 0,
  taxRate: 0,
  total: 0,
  terms:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur imperdiet lorem ut libero sodales, quis imperdiet ante tristique. Curabitur sit amet erat placerat.',
  managerName: 'Carollina Devasya',
  managerTitle: 'General Manager',
};

interface EnterpriseInvoiceProps {
  data?: InvoiceData;
  hideActions?: boolean;
}

const EnterpriseInvoice: React.FC<EnterpriseInvoiceProps> = ({ data = defaultData, hideActions = false }) => {
  const componentRef = useRef<HTMLDivElement>(null);

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
    taxRate,
    total,
    terms,
    managerName,
    managerTitle,
  } = data;

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      {!hideActions && (
        <div className="flex gap-4 mb-6 print:hidden">
          <button
            onClick={reactToPrintFn}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition"
          >
            Print / PDF
          </button>
        </div>
      )}

      <div
        ref={componentRef}
        className="w-[210mm] min-h-[297mm] bg-white shadow-xl print:shadow-none relative overflow-hidden"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <div
          className="absolute top-0 right-0 w-[55%] h-[130px] bg-primary"
          style={{
            borderBottomLeftRadius: '60px 60px',
          }}
        />

        <svg
          className="absolute top-[-40px] right-[-40px] w-[200px] h-[200px]"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="100" fill="#5CA9FF" opacity="0.15" />
        </svg>

        <svg
          className="absolute top-[20px] right-[60px] w-[60px] h-[60px]"
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="30" cy="30" r="30" fill="#80E5FF" opacity="0.3" />
        </svg>

        <svg
          className="absolute top-[100px] right-[140px] w-[80px] h-[80px]"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0H80V80C80 35.8177 44.1823 0 0 0Z"
            fill="#5CA9FF"
            opacity="0.1"
          />
        </svg>

        <div className="relative z-10 flex justify-between items-start px-10 pt-8">
          <div className="flex flex-col">
            <div className="w-[100px] h-[60px] bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-300">
              {company.logo ? (
                <img src={company.logo} alt="Logo" className="max-h-full" />
              ) : (
                <span>LOGO HERE</span>
              )}
            </div>
          </div>

          <div className="relative z-20 text-right pr-6 pt-2">
            <h1 className="text-white text-4xl font-black tracking-widest uppercase">
              INVOICE
            </h1>
          </div>
        </div>

        <div className="relative z-10 flex justify-between px-10 mt-6">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Invoice To:
            </p>
            <p className="text-lg font-bold text-primary">{customer.name}</p>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-primary font-bold">●</span>
              <span>{customer.address}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-primary font-bold">●</span>
              <span>{customer.phone}</span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <p className="text-sm">
              <span className="font-bold text-gray-600">Invoice No:</span>{' '}
              <span className="font-bold text-primary">{invoiceNo}</span>
            </p>
            <p className="text-sm">
              <span className="font-bold text-gray-600">Invoice Date:</span>{' '}
              <span className="font-bold text-primary">{invoiceDate}</span>
            </p>
            <p className="text-sm">
              <span className="font-bold text-gray-600">Account No:</span>{' '}
              <span className="font-bold text-primary">{accountNo}</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 flex px-10 mt-8 gap-6">
          <div className="w-[200px] flex-shrink-0">
            <div
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
              style={{ borderRadius: '16px' }}
            >
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Payment Method
              </p>
              {paymentMethods.map((method, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-gray-700 font-medium">{method}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-primary">
                  <th className="text-left py-2 font-bold text-primary uppercase tracking-wider text-xs">
                    PRODUCT
                  </th>
                  <th className="text-right py-2 font-bold text-primary uppercase tracking-wider text-xs">
                    PRICE
                  </th>
                  <th className="text-right py-2 font-bold text-primary uppercase tracking-wider text-xs">
                    QTY
                  </th>
                  <th className="text-right py-2 font-bold text-primary uppercase tracking-wider text-xs">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700 font-medium">{item.product}</td>
                    <td className="py-2 text-right text-gray-700">${item.price.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-700">{item.qty}</td>
                    <td className="py-2 text-right text-gray-700 font-bold">
                      ${item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between mt-4 gap-6">
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Terms &amp; Conditions
                </p>
                <p className="text-xs text-gray-500 leading-relaxed max-w-[280px]">
                  {terms}
                </p>
              </div>

              <div className="w-[180px] flex-shrink-0">
                <div className="space-y-1 border-t border-gray-200 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">SUB TOTAL</span>
                    <span className="font-bold text-gray-800">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">TAX</span>
                    <span className="font-bold text-gray-800">{taxRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-primary border-t-2 border-primary pt-1">
                    <span>TOTAL</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex justify-between items-end px-10 mt-8">
          <div className="flex-1">
            <div className="w-[200px] border-b-2 border-primary pt-1 mb-1" />
            <svg
              className="w-[60px] h-[30px] -mt-1"
              viewBox="0 0 60 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 15 Q15 0 25 15 Q35 30 45 15 Q55 0 60 10"
                stroke="#1E2E7A"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M10 20 Q20 5 30 20 Q40 35 50 20"
                stroke="#1E2E7A"
                strokeWidth="1.5"
                fill="none"
                opacity="0.6"
              />
            </svg>
            <p className="text-sm font-bold text-primary mt-1">{managerName}</p>
            <p className="text-xs text-gray-500">{managerTitle}</p>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-[80px] bg-primary"
          style={{
            borderTopRightRadius: '60px 60px',
          }}
        >
          <svg
            className="absolute bottom-0 left-0 w-[120px] h-[80px]"
            viewBox="0 0 120 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="20" cy="60" r="40" fill="#5CA9FF" opacity="0.15" />
            <circle cx="50" cy="70" r="20" fill="#80E5FF" opacity="0.2" />
            <rect x="80" y="40" width="30" height="30" rx="6" fill="#5CA9FF" opacity="0.1" />
          </svg>

          <svg
            className="absolute bottom-0 right-[60px] h-[80px]"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="70" cy="70" r="30" fill="#80E5FF" opacity="0.1" />
            <circle cx="40" cy="60" r="10" fill="#5CA9FF" opacity="0.2" />
          </svg>

          <div className="relative z-10 flex items-center justify-between h-full px-10 text-white">
            <div className="flex items-center gap-6 text-xs">
              <span className="font-medium">+ {company.phone.replace(/[^0-9+]/g, '')}</span>
              <span className="opacity-50">|</span>
              <span>{company.email}</span>
              <span className="opacity-50">|</span>
              <span>{company.website}</span>
            </div>
            <div className="text-xs opacity-60">
              <span>© {new Date().getFullYear()} {company.name}</span>
            </div>
          </div>
        </div>

        <svg
          className="absolute top-[180px] right-[20px] w-[40px] h-[40px]"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="10" cy="10" r="4" fill="#5CA9FF" opacity="0.2" />
          <circle cx="30" cy="10" r="4" fill="#5CA9FF" opacity="0.15" />
          <circle cx="10" cy="30" r="4" fill="#5CA9FF" opacity="0.1" />
          <circle cx="30" cy="30" r="4" fill="#5CA9FF" opacity="0.25" />
        </svg>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
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
          .shadow-xl {
            box-shadow: none !important;
          }
        }

        .bg-primary { background-color: #1E2E7A; }
        .text-primary { color: #1E2E7A; }
        .border-primary { border-color: #1E2E7A; }
        .bg-secondary { background-color: #5CA9FF; }
        .text-secondary { color: #5CA9FF; }
        .border-secondary { border-color: #5CA9FF; }
        .bg-accent { background-color: #80E5FF; }
        .text-accent { color: #80E5FF; }
        .border-accent { border-color: #80E5FF; }
        .bg-gray-custom { background-color: #F5F5F5; }
        .text-gray-custom { color: #F5F5F5; }
      `}</style>
    </div>
  );
};

export default EnterpriseInvoice;
