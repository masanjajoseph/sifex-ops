import { eventBus, createEvent, EventType } from "@/lib/events";
import { Prisma } from "@prisma/client";
import { CargoStatus } from "@/types/cargo-domain";
import { enqueueEvent } from "./queue";
import { TcraOperationCode, TcraStatusCode, TCRA_OPERATOR_CODE } from "./types";

const STATUS_MAP: Partial<Record<CargoStatus, { operationCode: TcraOperationCode; status: TcraStatusCode }>> = {
  [CargoStatus.ACCEPTED]: {
    operationCode: TcraOperationCode.ACCEPTANCE,
    status: TcraStatusCode.ACCEPTED,
  },
  [CargoStatus.RCS]: {
    operationCode: TcraOperationCode.DISPATCH,
    status: TcraStatusCode.DISPATCHED,
  },
  [CargoStatus.DELIVERED]: {
    operationCode: TcraOperationCode.DELIVERED,
    status: TcraStatusCode.DELIVERED,
  },
};

function toIsoLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

let serialCounter = 0;

function nextSerial(): string {
  serialCounter += 1;
  return String(serialCounter).padStart(6, "0");
}

export function subscribeToEvents() {
  eventBus.subscribe(EventType.SHIPMENT_STATUS_CHANGED, async (event) => {
    const { trackingNumber, cargoStatus, postedBranch, postedRegion, destinationBranch, destinationRegion, locality, serviceCode, serviceTypeCode, charges } = event.payload as Record<string, any>;
    const houseAWBId = event.aggregateId;

    const mapped = STATUS_MAP[cargoStatus as CargoStatus];
    if (!mapped) return;

    const now = new Date();
    const timestamp = toIsoLocal(now);
    const msgId = `${TCRA_OPERATOR_CODE}-${timestamp}-${mapped.operationCode}-${nextSerial()}`;

    await enqueueEvent({
      houseAWBId: houseAWBId as string,
      trackingNumber: trackingNumber as string,
      eventType: event.eventType,
      payload: {
        eventsList: [
          {
            msgInfo: {
              timestamp,
              msgId,
              operationCode: mapped.operationCode,
              operatorCode: TCRA_OPERATOR_CODE,
            },
            txnInfo: {
              eventTimestamp: timestamp,
              trackingNumber,
              postedBranch: postedBranch ?? "Unknown",
              postedRegion: postedRegion ?? "Unknown",
              destinationBranch: destinationBranch ?? "Unknown",
              destinationRegion: destinationRegion ?? "Unknown",
              locality: locality ?? "local",
              serviceCode: serviceCode ?? "S01",
              serviceTypeCode: serviceTypeCode ?? "ST01",
              status: mapped.status,
              charges: charges ?? [],
            },
          },
        ],
      } as Prisma.InputJsonValue,
    });
  });
}

export function triggerTcraEvent(
  houseAWBId: string,
  trackingNumber: string,
  cargoStatus: CargoStatus,
  extra?: Record<string, unknown>
) {
  const event = createEvent(EventType.SHIPMENT_STATUS_CHANGED, "HouseAWB", houseAWBId, {
    trackingNumber,
    cargoStatus,
    ...extra,
  });
  eventBus.publish(event);
}
