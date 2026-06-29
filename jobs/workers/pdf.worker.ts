import { NextRequest } from "next/server";
import { createWorker, enqueue } from "..";

async function generatePdf(billingId: string): Promise<Buffer> {
  const { GET } = await import("@/app/api/billing/[id]/pdf/route");
  const req = new NextRequest(new URL(`https://dummy/api/billing/${billingId}/pdf`));
  const res = await GET(req, { params: Promise.resolve({ id: billingId }) });
  return Buffer.from(await res.arrayBuffer());
}

export const pdfWorker = createWorker("pdf", async (job) => {
  const { billingId } = job.data as { billingId: string };
  const pdfBuffer = await generatePdf(billingId);
  return { size: pdfBuffer.length, billingId };
});

export async function enqueuePdfGeneration(billingId: string) {
  return enqueue("pdf", "generate-pdf", { billingId });
}
