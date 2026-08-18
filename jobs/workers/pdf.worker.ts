import { createWorker, enqueue } from "..";

export const pdfWorker = createWorker("pdf", async (job) => {
  const { billingId } = job.data as { billingId: string };
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invoice/${billingId}/pdf`);
  const pdfBuffer = Buffer.from(await res.arrayBuffer());
  return { size: pdfBuffer.length, billingId };
});

export async function enqueuePdfGeneration(billingId: string) {
  return enqueue("pdf", "generate-pdf", { billingId });
}
