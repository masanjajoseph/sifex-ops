import { eventBus, createEvent, EventType } from "@/lib/events";
import { Prisma } from "@prisma/client";
import { CargoStatus } from "@/types/cargo-domain";
import { enqueueEvent } from "./queue";
import { toTcraTimestamp } from "./time";
import { normalizeTzRegion } from "./tz-regions";
import { countryOfLocation, toTcraLocation } from "./locations";
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
    const { trackingNumber, cargoStatus, postedBranch, postedRegion, destinationBranch, destinationRegion, locality, serviceCode, serviceTypeCode, charges } = event.payload as Record<string, any>;
    const houseAWBId = event.aggregateId;

    const mapped = STATUS_MAP[cargoStatus as CargoStatus];
    if (!mapped) return;

    const now = new Date();
    const timestamp = toIsoLocal(now);
    const msgId = `${TCRA_OPERATOR_CODE}-${timestamp}-${mapped.operationCode}-${nextSerial()}`;

    const eventLocality = locality ?? "local";
    // Incoming and local shipments are delivered inside Tanzania, so the
    // destination region must be one of the TISP region names. Foreign
    // destinations (international_outgoing) are left untouched.
    const resolvedDestinationRegion =
      eventLocality === "international_outgoing"
        ? destinationRegion ?? "Unknown"
        : normalizeTzRegion(destinationRegion) ?? "Unknown";

    // TCRA does not accept company/branch wording in locations: stations are
    // rendered as "COUNTRY - City" (e.g. "CN - Guangzhou", "TZ - Dar es salaam").
    const resolvedPostedBranch = toTcraLocation(postedBranch);
    const resolvedDestinationBranch = toTcraLocation(destinationBranch);
    const resolvedPostedRegion = postedRegion ?? countryOfLocation(resolvedPostedBranch) ?? "Unknown";

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
              postedBranch: resolvedPostedBranch,
              postedRegion: resolvedPostedRegion,
              destinationBranch: resolvedDestinationBranch,
              destinationRegion: resolvedDestinationRegion,
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
