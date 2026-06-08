import { eventBus, DomainEvent } from "./event-bus";
import { eventStore } from "./event-store";
import { Prisma } from "@prisma/client";

type EventHandler = (event: DomainEvent) => Promise<void>;

class EventDispatcher {
  register(eventType: string, handler: EventHandler): void {
    eventBus.subscribe(eventType, handler);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    await eventStore.append({
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      data: event.payload as unknown as Prisma.InputJsonValue,
      metadata: event.metadata as unknown as Prisma.InputJsonValue | undefined,
      userId: event.userId ?? null,
    });

    await eventBus.publish(event);
  }
}

export const eventDispatcher = new EventDispatcher();
