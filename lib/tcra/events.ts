import { eventBus, createEvent, EventType } from "@/lib/events";
import { Prisma } from "@prisma/client";
import { CargoStatus } from "@/types/cargo-domain";
import { enqueueEvent } from "./queue";
import { toTcraTimestamp } from "./time";
import { resolveTcraEventGeography, type TcraEventGeography } from "./locations";
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
  return toTcraTimestamp(date);
}

let serialCounter = 0;

function nextSerial(): string {
  serialCounter += 1;
  return String(serialCounter).padStart(6, "0");
}

export function subscribeToEvents() {
  eventBus.subscribe(EventType.SHIPMENT_STATUS_CHANGED, async (event) => {
    const { trackingNumber, cargoStatus, postedBranch, destinationBranch, locality, serviceCode, serviceTypeCode, charges } = event.payload as Record<string, any>;
    const houseAWBId = event.aggregateId;

    const mapped = STATUS_MAP[cargoStatus as CargoStatus];
    if (!mapped) return;

    const now = new Date();
    const timestamp = toIsoLocal(now);
    const msgId = `${TCRA_OPERATOR_CODE}-${timestamp}-${mapped.operationCode}-${nextSerial()}`;

    // Geographical values are derived from the AWB stations:
    //   postedBranch      -> city only ("Guangzhou")
    //   postedRegion      -> ISO country ("CN")
    //   destinationBranch -> TISP area_name when the destination is Tanzania
    //                        ("Dar-es-salaam", "Mjini Magharibi", ...)
    //   destinationRegion -> ISO country ("TZ")
    const geo = resolveTcraEventGeography({ postedBranch, destinationBranch });
    const eventLocality = locality ?? inferLocality(geo);

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
              postedBranch: geo.postedBranch,
              postedRegion: geo.postedRegion,
              destinationBranch: geo.destinationBranch,
              destinationRegion: geo.destinationRegion,
              locality: eventLocality,
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

function inferLocality(geo: TcraEventGeography): "international_incoming" | "international_outgoing" | "local" {
  if (geo.postedRegion === "Unknown" || geo.destinationRegion === "Unknown") return "local";
  if (geo.postedRegion === geo.destinationRegion) return "local";
  return geo.destinationRegion === "TZ" ? "international_incoming" : "international_outgoing";
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
