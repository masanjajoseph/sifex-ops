import "@/lib/env";
import { tcraWorker } from "./workers/tcra.worker";
import { pdfWorker } from "./workers/pdf.worker";
import { notificationWorker } from "./workers/notification.worker";
import { analyticsWorker } from "./workers/analytics.worker";

const workers = [tcraWorker, pdfWorker, notificationWorker, analyticsWorker];

console.log("[Worker] BullMQ workers started");

process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});
