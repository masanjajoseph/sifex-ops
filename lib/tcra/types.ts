export const TCRA_OPERATOR_CODE = "1004";
export const TCRA_BASE_URL = process.env.TCRA_API_URL ?? "https://196.32.240.66:8000";

export enum TcraOperationCode {
  ACCEPTANCE = "OT01",
  DISPATCH = "OT02",
  DELIVERY_RECEIVED = "OT03",
  DELIVERED = "OT04",
  REVENUE = "OT05",
  SNAPSHOT = "OT06",
}

export enum TcraStatusCode {
  ACCEPTED = "accepted",
  DISPATCHED = "dispatched",
  DELIVERY_RECEIVED = "delivery_received",
  DELIVERED = "delivered",
}

export enum TcraResponseCode {
  OK = "RC00",
  GENERAL_ERROR = "RC01",
  INVALID_FORMAT = "RC02",
}

export interface TcraMsgInfo {
  timestamp: string;
  msgId: string;
  operationCode: TcraOperationCode;
  operatorCode: string;
}

export interface TcraCharge {
  chargeType: string;
  currency: string;
  amount: string;
}

export interface TcraTxnInfo {
  eventTimestamp: string;
  trackingNumber: string;
  postedBranch: string;
  postedRegion: string;
  destinationBranch: string;
  destinationRegion: string;
  locality: "international_incoming" | "international_outgoing" | "local";
  serviceCode: string;
  serviceTypeCode: string;
  status: TcraStatusCode;
  charges: TcraCharge[];
}

export interface TcraEvent {
  msgInfo: TcraMsgInfo;
  txnInfo: TcraTxnInfo;
}

export interface TcraEventRequest {
  eventsList: TcraEvent[];
}

export interface TcraMsgResponse {
  code: TcraResponseCode;
  txnId: string;
  message: string;
}

export interface TcraEventResponseItem {
  msgInfo: Pick<TcraMsgInfo, "timestamp" | "msgId">;
  msgResponse: TcraMsgResponse;
}

export type TcraEventResponse = TcraEventResponseItem[];

export interface TcraSnapshotRequest {
  msgInfo: TcraMsgInfo;
  txnInfo: { msgId: string }[];
}

export interface TcraSnapshotResponse {
  msgInfo: Pick<TcraMsgInfo, "timestamp" | "msgId">;
  msgResponse: TcraMsgResponse;
}

export interface TcraCallbackRequest {
  msgInfo: TcraMsgInfo;
  missingMsgIds: { msgId: string }[];
}

export interface TcraCallbackResponse {
  msgInfo: Pick<TcraMsgInfo, "timestamp" | "msgId">;
  msgResponse: TcraMsgResponse;
}
