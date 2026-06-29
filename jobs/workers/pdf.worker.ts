import { createWorker, enqueue } from "..";
import { prisma } from "@/lib/prisma";
import { uploadPDF } from "@/lib/storage";

export const pdfWorker = createWorker("pdf", async (job) => {
  const { billingId } = job.data as { billingId: string };

  const record = await prisma.billingRecord.findUnique({
    where: { id: billingId },
    include: { billingCharges: true, customer: true, payments: true },
  });
  if (!record) throw new Error(`BillingRecord not found: ${billingId}`);

  let pdfBuffer: Buffer;

  try {
    const { generateInvoicePdf } = await import("@/lib/pdf-generator");
    pdfBuffer = await generateInvoicePdf(record);
  } catch {
    const { GET } = await import("@/app/api/billing/[id]/pdf/route");
    const res = await GET(new Request(`https://dummy/billing/${billingId}/pdf`), {
      params: Promise.resolve({ id: billingId }),
    });
    pdfBuffer = Buffer.from(await res.arrayBuffer());
  }

  const key = await uploadPDF(billingId, pdfBuffer);

  await prisma.billingRecord.update({
    where: { id: billingId },
    data: { invoicePdfKey: key },
  });

  return { key, billingId };
});

export async function enqueuePdfGeneration(billingId: string) {
  return enqueue("pdf", "generate-pdf", { billingId });
}
