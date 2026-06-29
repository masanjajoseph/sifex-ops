import Ably from "ably";
import { env } from "@/lib/env";

let realtime: Ably.Realtime | null = null;

export function getRealtime(): Ably.Realtime {
  if (!realtime) {
    realtime = new Ably.Realtime({ key: env.ABLY_API_KEY });
  }
  return realtime;
}

export async function publish(channel: string, event: string, data: unknown): Promise<void> {
  const client = getRealtime();
  const ch = client.channels.get(channel);
  await ch.publish(event, data);
}

export function getChannel(channelName: string): Ably.RealtimeChannel {
  const client = getRealtime();
  return client.channels.get(channelName);
}
