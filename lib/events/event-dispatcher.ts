import { eventBus, DomainEvent, createEvent } from "./event-bus";
import { eventStore } from "./event-store";
import { logger } from "@/lib/logger";

type EventHandler = (event: DomainEvent) => Promise<void>;

interface SubscriptionRule {
  eventType: string;
  handler: EventHandler;
  subscriberName: string;
}

class EventDispatcher {
  private subscriptions: SubscriptionRule[] = [];

  register(eventType: string, handler: EventHandler, subscriberName = "anonymous"): void {
    this.subscriptions.push({ eventType, handler, subscriberName });
    eventBus.subscribe(eventType, handler, subscriberName);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    try {
      await eventStore.appendFromDomainEvent(event);
      await eventBus.publish(event);
    } catch (error) {
      logger.error("EventDispatcher: Failed to dispatch event", error as Error, "EventDispatcher");
    }
  }

  async dispatchAndWait(event: DomainEvent): Promise<void> {
    await eventStore.appendFromDomainEvent(event);
    await eventBus.publish(event);
  }

  async dispatchWithIdempotency(
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
    userId?: string,
    idempotencyKey?: string,
    correlationId?: string,
  ): Promise<void> {
    const event = createEvent(
      eventType,
      aggregateType,
      aggregateId,
      payload,
      userId,
      correlationId,
      idempotencyKey,
    );
    await this.dispatch(event);
  }

  getSubscriptions(): SubscriptionRule[] {
    return [...this.subscriptions];
  }
}

export const eventDispatcher = new EventDispatcher();
