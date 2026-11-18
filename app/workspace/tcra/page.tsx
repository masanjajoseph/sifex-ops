"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Link2,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TcraStatus {
  baseUrl: string;
  environment: string;
  integrationId: string | null;
  tokenId: string | null;
  signatureConfigured: boolean;
  signatureValid: boolean;
  endpoints: Record<string, string>;
}

interface TcraOutboxItem {
  id: string;
  trackingNumber: string;
  eventType: string;
  status: string;
  error: string | null;
  attempts: number;
  createdAt: string;
  sentAt: string | null;
  payload: Record<string, unknown>;
  response: Record<string, unknown> | null;
}

type FilterStatus = "ALL" | "PENDING" | "SENT" | "FAILED";

interface TcraMsgInfoShape {
  msgId?: string;
  timestamp?: string;
  operationCode?: string;
  operatorCode?: string;
}

interface TcraTxnInfoShape {
  eventTimestamp?: string;
  trackingNumber?: string;
  postedBranch?: string;
  postedRegion?: string;
  destinationBranch?: string;
  destinationRegion?: string;
  locality?: string;
  serviceCode?: string;
  serviceTypeCode?: string;
  status?: string;
  charges?: { chargeType?: string; currency?: string; amount?: string }[];
}

interface TcraEventShape {
  msgInfo?: TcraMsgInfoShape;
  txnInfo?: TcraTxnInfoShape;
}

interface TcraResponseShape {
  msgInfo?: { msgId?: string; timestamp?: string };
  msgResponse?: { code?: string; message?: string; txnId?: string };
}

function firstEvent(item: TcraOutboxItem): TcraEventShape | null {
  const payload = item.payload as { eventsList?: TcraEventShape[] } | null;
  return payload?.eventsList?.[0] ?? null;
}

function firstResponse(item: TcraOutboxItem): TcraResponseShape | null {
  const response = item.response as TcraResponseShape[] | TcraResponseShape | null;
  if (!response) return null;
  return Array.isArray(response) ? response[0] ?? null : response;
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-0.5 text-sm text-gray-900 dark:text-gray-100 break-words ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <pre className="max-h-56 overflow-auto rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-800 dark:bg-gray-950 dark:text-gray-200">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function TcraMonitorPage() {
  const [items, setItems] = useState<TcraOutboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus | "ALL">("ALL");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<TcraStatus | null>(null);
  const [selected, setSelected] = useState<TcraOutboxItem | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("status", filter);
      const res = await fetch(`/api/tcra/outbox?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      console.error("Failed to fetch TCRA outbox:", e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/tcra/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      await fetchData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const copyLog = async (item: TcraOutboxItem) => {
    const response = firstResponse(item);
    const log = {
      trackingNumber: item.trackingNumber,
      eventType: item.eventType,
      status: item.status,
      attempts: item.attempts,
      error: item.error,
      createdAt: item.createdAt,
      sentAt: item.sentAt,
      tcraResponse: response
        ? {
            code: response.msgResponse?.code,
            message: response.msgResponse?.message,
            txnId: response.msgResponse?.txnId,
            msgId: response.msgInfo?.msgId,
          }
        : null,
      request: item.payload,
      response: item.response,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the log to the clipboard");
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "SENT":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "FAILED":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SENT: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      FAILED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}>
        {status}
      </span>
    );
  };

  const selectedEvent = selected ? firstEvent(selected) : null;
  const selectedResponse = selected ? firstResponse(selected) : null;
  const selectedTxn = selectedEvent?.txnInfo;
  const selectedMsg = selectedEvent?.msgInfo;
  const selectedCharges = selectedTxn?.charges ?? [];
  const responseCode = selectedResponse?.msgResponse?.code;
  const responseOk = responseCode === "RC00";

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TCRA Integration Monitor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor events sent to Tanzania Communications Regulatory Authority
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRetry}
            disabled={processing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {processing ? "Processing..." : "Retry Pending"}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(["ALL", "PENDING", "SENT", "FAILED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filter === f
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            {f !== "ALL" && (
              <span className="ml-1.5 text-xs opacity-60">
                ({items.filter((i) => i.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No TCRA events found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Tracking</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Attempts</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Error</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sent</th>
                  <th className="px-2 py-3">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const event = firstEvent(item);
                  const operation = [event?.msgInfo?.operationCode, event?.txnInfo?.status]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <tr
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setCopied(false);
                        setSelected(item);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setCopied(false);
                          setSelected(item);
                        }
                      }}
                      className="cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {statusIcon(item.status)}
                          {statusBadge(item.status)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{item.trackingNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {operation || item.eventType}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.eventType}</div>
                      </td>
                      <td className="px-4 py-3">{item.attempts}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-red-600">{item.error ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {item.sentAt ? new Date(item.sentAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-2 py-3 text-gray-400">
                        <ChevronRight className="h-4 w-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        Total events: <strong>{total}</strong>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 font-mono text-base">
                  {selected.trackingNumber}
                  {statusBadge(selected.status)}
                </DialogTitle>
                <DialogDescription>
                  {selectedMsg?.operationCode ?? selected.eventType} event log
                  {selectedMsg?.msgId ? ` · ${selectedMsg.msgId}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Event</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                    <DetailRow label="Operation" value={selectedMsg?.operationCode ?? "-"} />
                    <DetailRow label="Status word" value={selectedTxn?.status ?? "-"} />
                    <DetailRow label="Locality" value={selectedTxn?.locality ?? "-"} />
                    <DetailRow
                      label="Origin"
                      value={
                        [selectedTxn?.postedBranch, selectedTxn?.postedRegion].filter(Boolean).join(" / ") || "-"
                      }
                    />
                    <DetailRow
                      label="Destination"
                      value={
                        [selectedTxn?.destinationBranch, selectedTxn?.destinationRegion]
                          .filter(Boolean)
                          .join(" / ") || "-"
                      }
                    />
                    <DetailRow
                      label="Service"
                      value={
                        [selectedTxn?.serviceCode, selectedTxn?.serviceTypeCode].filter(Boolean).join(" / ") || "-"
                      }
                    />
                    <DetailRow
                      label="Charges"
                      value={
                        selectedCharges.length > 0
                          ? selectedCharges
                              .map((c) => `${c.chargeType ?? "fee"} ${c.currency ?? ""} ${c.amount ?? ""}`.trim())
                              .join(" · ")
                          : "-"
                      }
                    />
                    <DetailRow label="Event timestamp" value={selectedTxn?.eventTimestamp ?? "-"} mono />
                    <DetailRow label="Operator" value={selectedMsg?.operatorCode ?? "-"} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">TCRA response</h3>
                  {selectedResponse ? (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                      <DetailRow
                        label="Code"
                        value={`${responseCode ?? "-"}${selectedResponse.msgResponse?.message ? ` — ${selectedResponse.msgResponse.message}` : ""}`}
                      />
                      <DetailRow label="Transaction id" value={selectedResponse.msgResponse?.txnId ?? "-"} mono />
                      <DetailRow label="Ack msgId" value={selectedResponse.msgInfo?.msgId ?? "-"} mono />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No response recorded yet. The event is still waiting for a successful delivery to TCRA.
                    </p>
                  )}
                  {responseCode && (
                    <span
                      className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
                        responseOk ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {responseOk ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                      {responseOk ? "Accepted by TCRA" : "Rejected by TCRA"}
                    </span>
                  )}
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Delivery</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                    <DetailRow label="Attempts" value={String(selected.attempts)} />
                    <DetailRow label="Created" value={new Date(selected.createdAt).toLocaleString()} />
                    <DetailRow
                      label="Sent"
                      value={selected.sentAt ? new Date(selected.sentAt).toLocaleString() : "-"}
                    />
                    <DetailRow label="Event type" value={selected.eventType} />
                    <DetailRow label="Row id" value={selected.id} mono />
                  </div>
                  {selected.error && (
                    <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                      {selected.error}
                    </p>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Raw log</h3>
                  <JsonBlock label="Request payload" value={selected.payload} />
                  {selected.response && <JsonBlock label="TCRA response" value={selected.response} />}
                </section>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => copyLog(selected)}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy log"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
