import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  userId?: string;
  timestamp: Date;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
}

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

interface SubscriberEntry {
  handler: EventHandler;
  subscriberName: string;
}

class EventBus {
  private handlers: Map<string, SubscriberEntry[]> = new Map();
  private retryDelays = [1000, 5000, 15000, 30000, 60000];
  private processedIds: Set<string> = new Set();

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>, subscriberName = "anonymous") {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push({ handler: handler as EventHandler, subscriberName });
    this.handlers.set(eventType, handlers);
  }

  async publish(event: DomainEvent): Promise<void> {
    if (this.processedIds.has(event.eventId)) return;
    this.processedIds.add(event.eventId);

    const entries = this.handlers.get(event.eventType) || [];
    await Promise.all(entries.map((entry) =>
      this.executeWithRetry(event, entry)
    ));
  }

  private async executeWithRetry(event: DomainEvent, entry: SubscriberEntry): Promise<void> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.retryDelays.length; attempt++) {
      try {
        await entry.handler(event);
        return;
      } catch (error) {
        lastError = error as Error;
        logger.error(`EventBus: Handler ${entry.subscriberName} failed for ${event.eventType} (attempt ${attempt + 1})`, lastError, "EventBus");
        if (attempt < this.retryDelays.length) {
          await new Promise(r => setTimeout(r, this.retryDelays[attempt]));
        }
      }
    }
    logger.error(`EventBus: Handler ${entry.subscriberName} exhausted retries for ${event.eventType}`, lastError!, "EventBus");
  }

  unsubscribe(eventType: string, handler: EventHandler) {
    const entries = this.handlers.get(eventType) || [];
    const index = entries.findIndex(e => e.handler === handler);
    if (index > -1) {
      entries.splice(index, 1);
    }
  }
}

export const eventBus = new EventBus();

let idCounter = 0;

export const createEvent = <T extends Record<string, unknown>>(
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: T,
  userId?: string,
  correlationId?: string,
  causationId?: string,
): DomainEvent => ({
  eventId: `${Date.now()}-${++idCounter}-${crypto.randomUUID().slice(0, 8)}`,
  eventType,
  aggregateId,
  aggregateType,
  userId,
  timestamp: new Date(),
  payload,
  correlationId,
  causationId,
});
