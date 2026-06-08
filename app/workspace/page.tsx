import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  Package,
  Plane,
  Warehouse,
  AlertTriangle,
  Scan,
  TrendingUp,
  DollarSign,
  Clock,
  MapPin,
  Activity,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Dashboard | Sifex',
  description: 'Enterprise operational dashboard',
};

export const dynamic = 'force-dynamic';

const stats = [
  {
    label: 'Active Shipments',
    value: '1,284',
    change: { value: 12.5, trend: 'up' as const },
    icon: <Package className="h-5 w-5" />,
    color: 'blue',
  },
  {
    label: 'Warehouse Items',
    value: '8,947',
    change: { value: 3.2, trend: 'up' as const },
    icon: <Warehouse className="h-5 w-5" />,
    color: 'orange',
  },
  {
    label: 'Customs Alerts',
    value: '23',
    change: { value: 8.1, trend: 'down' as const },
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'red',
  },
  {
    label: 'Flights in Transit',
    value: '47',
    change: { value: 5.3, trend: 'up' as const },
    icon: <Plane className="h-5 w-5" />,
    color: 'purple',
  },
  {
    label: 'Revenue (MTD)',
    value: '$2.4M',
    change: { value: 18.2, trend: 'up' as const },
    icon: <DollarSign className="h-5 w-5" />,
    color: 'green',
  },
];

const recentScans = [
  { id: 'SCN-001', location: 'JFK - Zone A', item: 'MAWB-2024-1284', status: 'success' as const, time: '2 min ago' },
  { id: 'SCN-002', location: 'LAX - Cargo Bay 3', item: 'HAWB-2024-891', status: 'success' as const, time: '5 min ago' },
  { id: 'SCN-003', location: 'ORD - Inspection', item: 'MAWB-2024-1276', status: 'warning' as const, time: '12 min ago' },
  { id: 'SCN-004', location: 'DFW - Outbound', item: 'HAWB-2024-887', status: 'success' as const, time: '18 min ago' },
  { id: 'SCN-005', location: 'MIA - Customs Hold', item: 'MAWB-2024-1265', status: 'error' as const, time: '25 min ago' },
];

const customsAlerts = [
  { priority: 'high' as const, title: 'Missing Documentation - MAWB-2024-1284', region: 'JFK Terminal 4', time: '10 min ago' },
  { priority: 'medium' as const, title: 'Customs Hold - Shipment IMP-2024-456', region: 'LAX Cargo', time: '1 hour ago' },
  { priority: 'low' as const, title: 'Value Declaration Review - EXP-2024-789', region: 'ORD', time: '3 hours ago' },
];

const flights = [
  { flight: 'SX-452', origin: 'JFK', destination: 'LAX', status: 'On Time' as const, departure: '14:30', items: 128 },
  { flight: 'SX-891', origin: 'LAX', destination: 'ORD', status: 'Boarding' as const, departure: '15:00', items: 89 },
  { flight: 'SX-334', origin: 'ORD', destination: 'DFW', status: 'Delayed' as const, departure: '16:15', items: 201 },
  { flight: 'SX-776', origin: 'DFW', destination: 'MIA', status: 'On Time' as const, departure: '17:00', items: 67 },
];

const billingSummary = [
  { label: 'Invoiced (MTD)', value: '$2.4M', change: '+18.2%' },
  { label: 'Outstanding', value: '$847K', change: '-5.3%' },
  { label: 'Overdue', value: '$124K', change: '+2.1%' },
  { label: 'Avg. Payment Terms', value: '32 days', change: '-1 day' },
];

const stationActivity = [
  { station: 'JFK', shipments: 342, scans: 1847, alerts: 5 },
  { station: 'LAX', shipments: 287, scans: 1523, alerts: 8 },
  { station: 'ORD', shipments: 198, scans: 976, alerts: 3 },
  { station: 'DFW', shipments: 156, scans: 834, alerts: 2 },
  { station: 'MIA', shipments: 134, scans: 712, alerts: 6 },
];

function StatCard({ stat }: { stat: typeof stats[0] }) {
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
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{stat.value}</p>
          {stat.change && (
            <p className={`mt-1 text-sm font-medium ${stat.change.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {stat.change.trend === 'up' ? '↑' : '↓'} {stat.change.value}%
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${colorMap[stat.color]}`}>
          {stat.icon}
        </div>
      </div>
    </div>
  );
}

export default async function WorkspacePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Operational Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enterprise overview — real-time cargo operations at a glance
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/workspace/export"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            New Shipment
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/workspace/export"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Package className="h-4 w-4" /> Create MAWB
        </Link>
        <Link
          href="/workspace/import"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Package className="h-4 w-4" /> Create HAWB
        </Link>
        <Link
          href="/workspace/warehouse"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Warehouse className="h-4 w-4" /> Receive Inventory
        </Link>
        <Link
          href="/workspace/tracking"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <MapPin className="h-4 w-4" /> Track Shipment
        </Link>
        <Link
          href="/workspace/billing"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <DollarSign className="h-4 w-4" /> Create Invoice
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Scans */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Scans</h2>
            <Scan className="h-4 w-4 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentScans.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    scan.status === 'success' ? 'bg-green-500' :
                    scan.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{scan.item}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{scan.location}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{scan.time}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <Link href="/workspace/export" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View all scans →
            </Link>
          </div>
        </div>

        {/* Customs Alerts */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Customs Alerts</h2>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {customsAlerts.map((alert, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    alert.priority === 'high' ? 'bg-red-500' :
                    alert.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{alert.region} · {alert.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <Link href="/workspace/customs" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View all alerts →
            </Link>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Flight Status */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Flights in Transit</h2>
            <Plane className="h-4 w-4 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {flights.map((flight) => (
              <div key={flight.flight} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{flight.flight}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{flight.origin} → {flight.destination}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{flight.departure}</p>
                  <p className={`text-xs ${
                    flight.status === 'On Time' ? 'text-green-600 dark:text-green-400' :
                    flight.status === 'Boarding' ? 'text-blue-600 dark:text-blue-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>{flight.status}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <Link href="/workspace/flights" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View all flights →
            </Link>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Billing Summary</h2>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-1 p-5">
            {billingSummary.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.label}</p>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.value}</p>
                  <p className={`text-xs ${
                    item.change.startsWith('+') ? 'text-green-600 dark:text-green-400' :
                    item.change.startsWith('-') ? 'text-red-600 dark:text-red-400' :
                    'text-gray-500'
                  }`}>{item.change}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <Link href="/workspace/billing" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View billing details →
            </Link>
          </div>
        </div>

        {/* Station Activity */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Station Activity</h2>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {stationActivity.map((station) => (
              <div key={station.station} className="flex items-center justify-between px-5 py-2.5">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{station.station}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{station.shipments} shipments</span>
                  <span>{station.scans} scans</span>
                  <span className={station.alerts > 5 ? 'text-red-500 font-medium' : ''}>{station.alerts} alerts</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <Link href="/workspace/settings" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View station details →
            </Link>
          </div>
        </div>
      </div>

      {/* Operational KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">On-Time Delivery</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">94.7%</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2.5 text-green-600 dark:bg-green-950 dark:text-green-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg. Transit Time</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">2.4 days</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Processing Time</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">1.8 hours</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-50 p-2.5 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Exception Rate</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">2.1%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
