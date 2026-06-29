import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const P = rgb(0.82, 0.00, 0.13);
const R = rgb(0.06, 0.00, 0.19);
const W = rgb(1, 1, 1);
const G = rgb(0.5, 0.5, 0.5);
const L = rgb(0.96, 0.96, 0.96);
const D = rgb(0.2, 0.2, 0.2);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const record = await prisma.billingRecord.findUnique({
    where: { id, deletedAt: null },
    include: { billingCharges: true, payments: true, customer: true },
  });

  if (!record) {
    return new Response("Invoice not found", { status: 404 });
  }

  const houseAWB = record.houseAWBId
    ? await prisma.houseAWB.findUnique({
        where: { id: record.houseAWBId },
        include: {
          shipper: { select: { name: true, phone: true, address: true, city: true, email: true } },
          masterAWB: { select: { awbNumber: true, shipmentType: true, originStation: { select: { name: true, code: true } } } },
        },
      })
    : null;

  const latestRate = await prisma.exchangeRateSnapshot.findFirst({ orderBy: { validAt: "desc" } });
  const exchangeRate =
    latestRate && typeof latestRate.rates === "object" && latestRate.rates !== null
      ? (latestRate.rates as Record<string, number>)["TZS"] ?? 2500
      : 2500;

  const items = record.billingCharges.map((c) => ({
    description: c.description || c.type.replace(/_/g, " "),
    price: c.amount,
    qty: 1,
    total: c.amount,
  }));
  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;
  const totalTzs = total * exchangeRate;
  const invNum = record.id.slice(0, 8).toUpperCase();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const pw = page.getWidth();
  const rx = pw - 50;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 0;

  function t(text: string, x: number, sz: number, b?: boolean, c?: ReturnType<typeof rgb>) {
    page.drawText(text, { x, y: y - sz * 1.2, size: sz, font: b ? bold : font, color: c || D });
  }
  function tr(text: string, x: number, sz: number, b?: boolean, c?: ReturnType<typeof rgb>) {
    const f = b ? bold : font;
    page.drawText(text, { x: x - f.widthOfTextAtSize(text, sz), y: y - sz * 1.2, size: sz, font: f, color: c || D });
  }
  function sep(yy: number) {
    page.drawLine({ start: { x: 50, y: yy }, end: { x: rx, y: yy }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  }
  function rect(yy: number, h: number, clr: ReturnType<typeof rgb>) {
    page.drawRectangle({ x: 50, y: yy - h, width: pw - 100, height: h, color: clr });
  }

  // ─── HEADER ───
  y = 780;

  // Logo
  try {
    const lp = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(lp)) {
      const lb = fs.readFileSync(lp);
      const img = lb[0] === 0x89 ? await pdfDoc.embedPng(lb) : await pdfDoc.embedJpg(lb);
      if (img && typeof img.width === 'number' && img.width > 0) {
        const ls = { width: img.width * 0.28, height: img.height * 0.28 };
        page.drawImage(img, { x: 50, y: y - ls.height, width: ls.width, height: ls.height });
        t("SIFEX COURIER SERVICES COMPANY LTD", 50 + ls.width + 12, 16, true, P);
        t("International Shipping & Logistics", 50 + ls.width + 12, 8, false, G);
        t("Dar es Salaam, Tanzania | info@sifex.co.tz", 50 + ls.width + 12, 7, false, G);
        y -= ls.height + 12;
      } else throw 'invalid';
    } else throw 'no file';
  } catch {
    rect(y, 50, P);
    page.drawRectangle({ x: 52, y: y - 48, width: 46, height: 46, color: W });
    page.drawText("S", { x: 65, y: y - 38, size: 24, font: bold, color: P });
    t("SIFEX COURIER SERVICES COMPANY LTD", 110, 16, true, P);
    t("International Shipping & Logistics", 110, 8, false, G);
    t("Dar es Salaam, Tanzania | info@sifex.co.tz", 110, 7, false, G);
    y -= 62;
  }

  // Invoice number badge + status (right side)
  const st = record.status === "PAID" ? "PAID" : record.status === "CREDITED" ? "CREDITED" : "UNPAID";
  const stC = st === "PAID" ? rgb(0.08, 0.46, 0.14) : st === "CREDITED" ? rgb(0, 0.25, 0.52) : rgb(0.52, 0.27, 0);
  const stB = st === "PAID" ? rgb(0.83, 0.93, 0.85) : st === "CREDITED" ? rgb(0.8, 0.9, 1) : rgb(1, 0.95, 0.8);
  tr(st, rx, 10, true, stC);
  // Invoice badge background
  const badgeW = bold.widthOfTextAtSize("INVOICE", 9) + 20;
  const badgeH = 38;
  const badgeX = rx - bold.widthOfTextAtSize(invNum, 22) - 16;
  page.drawRectangle({ x: badgeX, y: y - badgeH, width: rx - badgeX, height: badgeH, color: P });
  t("INVOICE", badgeX + 10, 9, true, rgb(0.7, 0.7, 0.7));
  t(invNum, badgeX + 10, 22, true, W);
  y = 695;

  sep(y);
  y -= 16;

  // ─── CUSTOMER + INVOICE INFO ───
  // Left: Invoice To
  t("INVOICE TO", 50, 9, true, P);
  if (record.customer) {
    t(record.customer.name || "-", 50, 12, true, D);
    y -= 16;
    if (record.customer.address) { t(record.customer.address, 50, 9, false, G); y -= 13; }
    if (record.customer.city) { t(record.customer.city, 50, 9, false, G); y -= 13; }
    if (record.customer.phone) { t("Phone: " + record.customer.phone, 50, 9, false, G); y -= 13; }
    if (record.customer.email) { t("Email: " + record.customer.email, 50, 9, false, G); y -= 13; }
  } else { y -= 14; t("N/A", 50, 10); y -= 14; }

  // Right: Invoice Details
  const iy = y + 16;
  let iyPos = iy;
  t("INVOICE DETAILS", rx - 150, 9, true, P);
  iyPos -= 14;
  for (const [l, v] of [
    ["Invoice Number", invNum],
    ["Invoice Date", record.invoicedAt ? new Date(record.invoicedAt).toLocaleDateString() : new Date(record.createdAt).toLocaleDateString()],
    ["Account Number", houseAWB?.houseAWBNumber || "-"],
    ["MAWB", houseAWB?.masterAWB?.awbNumber || "-"],
    ["Origin", houseAWB?.masterAWB?.originStation?.code || "-"],
  ]) {
    t(l + ":", rx - 150, 9, false, G);
    t(v, rx - 60, 9, true, D);
    iyPos -= 13;
  }
  y = Math.max(y, iyPos) + 6;

  sep(y);
  y -= 8;

  // ─── TWO-COLUMN BODY ───
  // Left sidebar: payment methods
  const leftX = 50;
  const leftW = 170;
  const rightX = leftX + leftW + 20;
  const rightW = pw - rightX - 50;

  rect(y, 16, L);
  t("PAYMENT METHODS", leftX + 8, 9, true, P);
  y -= 8;

  // Payment methods card
  rect(y, 100, L);
  t("Bank Transfer", leftX + 10, 9, true, D);
  y -= 11;
  t("CRDB: 0151234567890", leftX + 10, 7, false, G);
  y -= 10;
  t("NMB: 41234567890", leftX + 10, 7, false, G);
  y -= 10;
  t("NBC: 011234567890", leftX + 10, 7, false, G);
  y -= 13;
  t("Lipa Namba", leftX + 10, 9, true, D);
  y -= 11;
  t("CRDB Lipa Hapa: 451234", leftX + 10, 7, false, G);
  y -= 10;
  t("NMB Lipa: 561234", leftX + 10, 7, false, G);
  y -= 10;
  t("Vodacom Lipa: 123456", leftX + 10, 7, false, G);
  y -= 10;
  t("Tigo Lipa: 234567", leftX + 10, 7, false, G);
  y -= 13;
  t("Mobile Money", leftX + 10, 9, true, D);
  y -= 11;
  t("M-Pesa | TigoPesa | AirtelMoney", leftX + 10, 7, false, G);
  y -= 10;
  t("Card: Pay via EvPay checkout", leftX + 10, 7, false, G);
  y -= 13;

  // Terms
  rect(y, 50, L);
  t("TERMS & CONDITIONS", leftX + 8, 9, true, P);
  y -= 13;
  t("Payment due upon receipt. Late fee of", leftX + 10, 7, false, G);
  y -= 10;
  t("2% per month on overdue balances.", leftX + 10, 7, false, G);

  // ─── RIGHT: TABLE ───
  // Table Header
  const colX = { desc: rightX, price: rightX + rightW * 0.5, qty: rightX + rightW * 0.7, total: rightX + rightW * 0.88 };
  const colRight = (col: keyof typeof colX) => colX[col];

  // Header bar
  const th = rightX + rightW - rightX;
  page.drawRectangle({ x: rightX, y: y + 8, width: th, height: 16, color: P });
  t("Description", rightX + 6, 9, true, W);
  tr("Price", colRight('price') + th * 0.12, 9, true, W);
  tr("Qty", colRight('qty') + th * 0.3, 9, true, W);
  tr("Total", colRight('total') + th * 0.12, 9, true, W);
  y -= 2;

  // Table rows
  items.forEach((item, i) => {
    if (i % 2 === 0) page.drawRectangle({ x: rightX, y: y - 6, width: th, height: 16, color: L });
    y -= 14;
    t(item.description, rightX + 6, 9);
    tr("$" + item.price.toFixed(2), colRight('price') + th * 0.12, 9);
    tr(String(item.qty), colRight('qty') + th * 0.3, 9);
    tr("$" + item.total.toFixed(2), colRight('total') + th * 0.12, 9);
  });

  // Totals
  y -= 8;
  const totX = rx - 180;
  rect(y, 52, L);
  tr("Subtotal:", rx - 10, 10);
  tr("$" + subtotal.toFixed(2), rx, 10);
  tr("Tax (18%):", rx - 10, 10);
  tr("$" + tax.toFixed(2), rx, 10);
  tr("TOTAL:", rx - 10, 14, true, P);
  tr("$" + total.toFixed(2), rx, 14, true, P);
  tr("TZS " + totalTzs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rx, 9, false, G);
  tr("Rate: 1 USD = " + exchangeRate + " TZS", rx, 8, false, G);
  y -= 60;

  // ─── PAYMENT HISTORY ───
  if (record.payments.length > 0) {
    y -= 10;
    sep(y);
    y -= 14;
    page.drawRectangle({ x: rightX, y: y - 14, width: th, height: 14, color: P });
    t("Date", rightX + 6, 8, true, W);
    t("Method", rightX + 70, 8, true, W);
    t("Reference", rightX + 150, 8, true, W);
    tr("Amount", colRight('total') + th * 0.12, 8, true, W);
    y -= 18;
    record.payments.forEach((p) => {
      t(new Date(p.paymentDate).toLocaleDateString(), rightX + 6, 8);
      t(p.paymentMethod.replace(/_/g, " "), rightX + 70, 8);
      t(p.reference || "-", rightX + 150, 8);
      tr(p.currency + " " + p.amount.toFixed(2), colRight('total') + th * 0.12, 8);
      y -= 13;
    });
  }

  // ─── FOOTER ───
  y = 60;
  // Manager signature (left)
  t("MANAGER SIGNATURE", 50, 9, true, P);
  y -= 11;
  page.drawLine({ start: { x: 50, y }, end: { x: 220, y }, thickness: 0.8, color: rgb(0.8, 0.8, 0.8) });
  y -= 14;
  t("Masanja Joseph", 50, 11, true, D);
  y -= 12;
  t("General Manager", 50, 8, false, G);

  // Right: generated date
  tr("Invoice #" + invNum, rx, 8, false, G);
  tr("Generated " + new Date().toLocaleString(), rx, 8, false, G);

  // Bottom dark strip
  y = 30;
  page.drawRectangle({ x: 50, y: y - 22, width: pw - 100, height: 22, color: P });
  const stripItems = [
    ["Phone", "+255 688 930 963"],
    ["Email", "info@sifex.co.tz"],
    ["Website", "www.sifex.co.tz"],
  ];
  const stripGap = (pw - 100) / 3;
  stripItems.forEach(([l, v], i) => {
    const sx = 50 + stripGap * i + stripGap / 2;
    t(l, sx - font.widthOfTextAtSize(l, 6) / 2, 6, false, rgb(0.5, 0.5, 0.6));
    t(v, sx - bold.widthOfTextAtSize(v, 8) / 2, 8, true, W);
  });

  const pdfBytes = await pdfDoc.save();
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="INVOICE-${invNum}.pdf"`,
    },
  });
}
