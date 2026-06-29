"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";

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

export default function TcraMonitorPage() {
  const [items, setItems] = useState<TcraOutboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus | "ALL">("ALL");
  const [error, setError] = useState("");

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
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {statusIcon(item.status)}
                        {statusBadge(item.status)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{item.trackingNumber}</td>
                    <td className="px-4 py-3">{item.eventType}</td>
                    <td className="px-4 py-3">{item.attempts}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-red-600">{item.error ?? "-"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.sentAt ? new Date(item.sentAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        Total events: <strong>{total}</strong>
      </div>
    </div>
  );
}
