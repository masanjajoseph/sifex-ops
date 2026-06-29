"use client";

import { useEffect, useRef, useCallback } from "react";
import type { InboundMessage, messageCallback } from "ably";
import { getChannel } from "@/lib/realtime";

type MessageCallback = (message: InboundMessage) => void;

export function useRealtimeChannel(channelName: string, onMessage: MessageCallback) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    const channel = getChannel(channelName);
    const handler: messageCallback<InboundMessage> = (message) => {
      callbackRef.current(message);
    };
    channel.subscribe(handler);
    return () => { channel.unsubscribe(handler); };
  }, [channelName]);
}

export function useRealtimeEvent(
  channelName: string,
  event: string,
  callback: (data: unknown) => void,
) {
  const handler = useCallback(
    (message: InboundMessage) => {
      if (message.name === event) callback(message.data);
    },
    [event, callback],
  );
  useRealtimeChannel(channelName, handler);
}
