'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, Package, DollarSign, Clock, Truck, FileText, Users, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';

interface ReportData {
  shipments: { total: number; arrived: number; warehouse: number; delivered: number; pending: number; byStage: { workflowStage: string; _count: number }[]; byStatus: { cargoStatus: string; _count: number }[] };
  invoices: { totalInvoices: number; totalAmount: number; paidInvoices: number; paidAmount: number; unpaidInvoices: number; revenue: number; byStatus: { status: string; _count: number; _sum: { totalAmount: number } }[] };
  deliveries: { assigned: number; completed: number; failed: number; byStatus: { status: string; _count: number }[] };
  customers: { totalCustomers: number; activeCustomers: number; topCustomers: { customerId: string; customerName: string; shipmentCount: number }[] };
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | 'mtd' | 'ytd'>('mtd');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'all' });
      const now = new Date();
      if (dateRange === 'mtd') {
        params.set('from', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
      } else if (dateRange === 'ytd') {
        params.set('from', new Date(now.getFullYear(), 0, 1).toISOString());
      }
      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch { } finally { setLoading(false); }
  }, [dateRange]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const totalShipments = data?.shipments.total ?? 0;
  const revenue = data?.invoices.revenue ?? 0;
  const deliveredCount = data?.shipments.delivered ?? 0;
  const onTimeRate = totalShipments > 0 ? Math.round((deliveredCount / totalShipments) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Business intelligence and operational analytics"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Reports' }]}
        action={
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="all">All Time</option>
              <option value="mtd">Month to Date</option>
              <option value="ytd">Year to Date</option>
            </select>
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Total Shipments" value={totalShipments.toLocaleString()} icon={<Package className="h-5 w-5" />} />
            <StatCard label="Revenue" value={`$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<DollarSign className="h-5 w-5" />} />
            <StatCard label="On-Time Rate" value={`${onTimeRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
            <StatCard label="Active Customers" value={(data?.customers.activeCustomers ?? 0).toLocaleString()} icon={<Users className="h-5 w-5" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Shipment Overview</h3>
              {data?.shipments.byStage && data.shipments.byStage.length > 0 ? (
                <div className="space-y-3">
                  {data.shipments.byStage.map((s) => (
                    <div key={s.workflowStage} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{s.workflowStage.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-blue-100 dark:bg-blue-900" style={{ width: `${Math.max(4, (s._count / totalShipments) * 200)}px` }}>
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(s._count / totalShipments) * 100}%` }} />
                        </div>
                        <span className="min-w-[3rem] text-right text-sm font-medium">{s._count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No shipment data available</p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Invoice Summary</h3>
              {data?.invoices.byStatus && data.invoices.byStatus.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {data.invoices.byStatus.map((s) => (
                    <div key={s.status} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.status.replace(/_/g, ' ')}</p>
                      <p className="mt-1 text-lg font-semibold">{s._count}</p>
                      <p className="text-xs text-gray-400">${(s._sum?.totalAmount ?? 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No invoice data available</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400">Revenue</p>
                  <p className="text-lg font-semibold text-green-700 dark:text-green-300">${(data?.invoices.revenue ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400">Paid Invoices</p>
                  <p className="text-lg font-semibold text-green-700 dark:text-green-300">{data?.invoices.paidInvoices ?? 0} / {data?.invoices.totalInvoices ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Delivery Status</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
                  <Truck className="mx-auto mb-1 h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-lg font-semibold">{data?.deliveries.assigned ?? 0}</p>
                  <p className="text-xs text-gray-500">Assigned</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
                  <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-lg font-semibold">{data?.deliveries.completed ?? 0}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-900/20">
                  <XCircle className="mx-auto mb-1 h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="text-lg font-semibold">{data?.deliveries.failed ?? 0}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
              </div>
              {data?.deliveries.byStatus && data.deliveries.byStatus.length > 0 && (
                <div className="mt-3 space-y-1">
                  {data.deliveries.byStatus.map((d) => (
                    <div key={d.status} className="flex justify-between text-xs text-gray-500">
                      <span>{d.status.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{d._count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Top Customers</h3>
              {data?.customers.topCustomers && data.customers.topCustomers.length > 0 ? (
                <div className="space-y-2">
                  {data.customers.topCustomers.map((c, i) => (
                    <div key={c.customerId} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">{i + 1}</span>
                        <span className="text-gray-700 dark:text-gray-300">{c.customerName}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{c.shipmentCount} shipments</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No customer data available</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


