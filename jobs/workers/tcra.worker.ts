import { createWorker, enqueue } from "..";
import { processPendingEvents } from "@/lib/tcra/queue";

export const tcraWorker = createWorker("tcra", async (job) => {
  const { action } = job.data as { action: string };

  switch (action) {
    case "process-outbox":
      await processPendingEvents();
      break;
    case "send-snapshot":
      const { sendDailySnapshot } = await import("@/lib/tcra/snapshot");
      await sendDailySnapshot();
      break;
    default:
      throw new Error(`Unknown TCRA action: ${action}`);
  }
});

export async function enqueueTcraProcessing(delayMs = 0) {
  return enqueue("tcra", "process-outbox", { action: "process-outbox" }, { delay: delayMs });
}

export async function enqueueTcraSnapshot() {
  return enqueue("tcra", "send-snapshot", { action: "send-snapshot" });
}
