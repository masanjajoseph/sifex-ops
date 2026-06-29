'use client';

import { useState, useEffect } from 'react';
import {
  Package, Plane, Warehouse, AlertTriangle, Scan, TrendingUp, DollarSign, Clock, MapPin, Activity,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

interface DashboardData {
  kpi: {
    activeShipments: number;
    warehouseItems: number;
    customsAlerts: number;
    flightsInTransit: number;
    revenue: number;
    onTimeRate: number;
    totalShipments: number;
  };
  recentScans: Array<{
    id: string;
    eventType: string;
    barcode: string;
    success: boolean;
    createdAt: string;
    userId: string;
  }>;
  customsAlerts: Array<{
    id: string;
    declarationNumber: string;
    status: string;
    createdAt: string;
  }>;
  flights: Array<{
    id: string;
    flightNumber: string;
    status: string;
    departureTime: string;
    totalCapacity: number;
    availableCapacity: number;
  }>;
  billing: {
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    recordCount: number;
  };
  stationActivity: Array<{
    station: string;
    name: string;
    shipments: number;
    scans: number;
  }>;
}

export default function OverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toLocaleString()}`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'CUSTOMS_HOLD': return 'bg-red-500';
      case 'CUSTOMS_QUERY': return 'bg-yellow-500';
      case 'UNDER_REVIEW': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const flightStatusClass = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'text-green-600 dark:text-green-400';
      case 'BOARDING': return 'text-blue-600 dark:text-blue-400';
      case 'DELAYED': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Overview"
        description="Enterprise statistics — real-time cargo operations at a glance"
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : !data ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-500">
          Unable to load overview data.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Active Shipments" value={data.kpi.activeShipments.toLocaleString()} change={{ value: 0, trend: 'up' as const }} icon={<Package className="h-5 w-5" />} color="blue" />
            <KpiCard label="Warehouse Items" value={data.kpi.warehouseItems.toLocaleString()} change={{ value: 0, trend: 'up' as const }} icon={<Warehouse className="h-5 w-5" />} color="orange" />
            <KpiCard label="Customs Alerts" value={data.kpi.customsAlerts.toLocaleString()} change={{ value: 0, trend: 'down' as const }} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
            <KpiCard label="Flights in Transit" value={data.kpi.flightsInTransit.toLocaleString()} change={{ value: 0, trend: 'up' as const }} icon={<Plane className="h-5 w-5" />} color="purple" />
            <KpiCard label="Revenue (MTD)" value={formatCurrency(data.kpi.revenue)} change={{ value: 0, trend: 'up' as const }} icon={<DollarSign className="h-5 w-5" />} color="green" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Scans</h2>
                <Scan className="h-4 w-4 text-gray-400" />
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.recentScans.slice(0, 5).map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${scan.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{scan.barcode}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{scan.eventType}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(scan.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                <Link href="/workspace/export" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  View all scans →
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Customs Alerts</h2>
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.customsAlerts.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-500">No active customs alerts</div>
                ) : (
                  data.customsAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${statusColor(alert.status)}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.declarationNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{alert.status.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                <Link href="/workspace/customs" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  View all alerts →
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Flights in Transit</h2>
                <Plane className="h-4 w-4 text-gray-400" />
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.flights.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-500">No upcoming flights</div>
                ) : (
                  data.flights.slice(0, 5).map((flight) => (
                    <div key={flight.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{flight.flightNumber}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{Math.round(flight.totalCapacity - flight.availableCapacity)} items booked</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className={`text-xs ${flightStatusClass(flight.status)}`}>{flight.status.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                <Link href="/workspace/flights" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  View all flights →
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Billing Summary</h2>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-1 p-5">
                <BillingRow label="Total Invoiced" value={formatCurrency(data.billing.totalAmount)} change="" />
                <BillingRow label="Paid" value={formatCurrency(data.billing.paidAmount)} change="" />
                <BillingRow label="Outstanding" value={formatCurrency(data.billing.remainingAmount)} change="" />
                <BillingRow label="Invoices" value={data.billing.recordCount.toString()} change="" />
              </div>
              <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                <Link href="/workspace/billing" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  View billing details →
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Station Activity</h2>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.stationActivity.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-500">No station activity data</div>
                ) : (
                  data.stationActivity.slice(0, 5).map((station) => (
                    <div key={station.station} className="flex items-center justify-between px-5 py-2.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{station.station}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{station.shipments} shipments</span>
                        <span>{station.scans} scans</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                <Link href="/workspace/settings" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  View station details →
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OpKpiCard icon={<TrendingUp className="h-5 w-5" />} label="On-Time Delivery" value={`${data.kpi.onTimeRate}%`} color="blue" />
            <OpKpiCard icon={<Package className="h-5 w-5" />} label="Total Shipments" value={data.kpi.totalShipments.toLocaleString()} color="green" />
            <OpKpiCard icon={<Clock className="h-5 w-5" />} label="Active Shipments" value={data.kpi.activeShipments.toLocaleString()} color="purple" />
            <OpKpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Customs Alerts" value={data.kpi.customsAlerts.toLocaleString()} color="orange" />
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, change, icon, color }: {
  label: string; value: string; change: { value: number; trend: 'up' | 'down' }; icon: React.ReactNode; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400',
    red: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
    green: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function BillingRow({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function OpKpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
