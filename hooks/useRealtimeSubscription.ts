"use client";

import { useEffect, useRef } from "react";

type MessageHandler = (data: unknown) => void;

let ablyInstance: any = null;

async function getAbly(): Promise<any> {
  if (ablyInstance) return ablyInstance;
  const Ably = await import("ably");
  ablyInstance = new Ably.Realtime({ authUrl: "/api/ably/auth" });
  return ablyInstance;
}

export function useRealtimeSubscription(
  channelName: string | null,
  eventName: string,
  handler: MessageHandler,
) {
  const handlerRef = useRef<MessageHandler>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!channelName || typeof window === "undefined") return;

    let mounted = true;
    let ably: any;
    let channel: any;

    const init = async () => {
      try {
        ably = await getAbly();
        channel = ably.channels.get(channelName);
        await channel.subscribe(eventName, (message: any) => {
          if (mounted) handlerRef.current(message.data);
        });
      } catch {}
    };

    init();

    return () => {
      mounted = false;
      if (channel) {
        try {
          const p = channel.unsubscribe(eventName);
          if (p && typeof p.catch === "function") p.catch(() => {});
        } catch {}
      }
    };
  }, [channelName, eventName]);
}

export function useKpiSubscription(handler: MessageHandler) {
  return useRealtimeSubscription("kpi", "kpi-updated", handler);
}

export function useDashboardSubscription(handler: MessageHandler) {
  return useRealtimeSubscription("dashboard", "updated", handler);
}

export function useNotificationSubscription(
  userId: string | undefined,
  handler: MessageHandler,
) {
  return useRealtimeSubscription(
    userId ? `notifications:${userId}` : null,
    "notification",
    handler,
  );
}

export function useWorkflowQueueSubscription(
  module: string,
  handler: MessageHandler,
) {
  return useRealtimeSubscription(`workflow-queue:${module}`, "queue-updated", handler);
}

export function useEntitySubscription(
  entityType: string,
  entityId: string,
  handler: MessageHandler,
) {
  const channel =
    entityType === "MasterAWB"
      ? `master-awb:${entityId}`
      : entityType === "HouseAWB"
        ? `house-awb:${entityId}`
        : entityType === "BillingRecord"
          ? `billing:${entityId}`
          : null;

  return useRealtimeSubscription(channel, "updated", handler);
}

export function useActivityFeedSubscription(handler: MessageHandler) {
  return useRealtimeSubscription("activity-feed", "activity-created", handler);
}

export function useDocumentSubscription(handler: MessageHandler) {
  return useRealtimeSubscription("documents", "document-created", handler);
}

export function useScanSubscription(handler: MessageHandler) {
  return useRealtimeSubscription("scans", "scan-created", handler);
}

export function useDepartmentSubscription(departmentId: string | undefined, handler: MessageHandler) {
  return useRealtimeSubscription(
    departmentId ? `department:${departmentId}` : null,
    "updated",
    handler,
  );
}

export function useBranchSubscription(branchId: string | undefined, handler: MessageHandler) {
  return useRealtimeSubscription(
    branchId ? `branch:${branchId}` : null,
    "updated",
    handler,
  );
}

export function useModuleSubscription(module: string, handler: MessageHandler) {
  return useRealtimeSubscription(module, "updated", handler);
}
