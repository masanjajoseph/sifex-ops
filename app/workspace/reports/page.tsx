'use client';

import { BarChart3, Download, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Business intelligence and operational analytics"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Reports' }]}
        action={
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Shipments MTD" value="1,284" icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard label="Revenue MTD" value="$2.4M" icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard label="On-Time Rate" value="94.7%" icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard label="Avg Transit" value="2.4 days" icon={<Calendar className="h-5 w-5" />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Available Reports</h3>
          <div className="space-y-2">
            {[
              'Shipment Performance Report',
              'Station Operations Summary',
              'Customs Clearance Efficiency',
              'Warehouse Utilization Report',
              'Billing & Revenue Analysis',
              'Customer Shipment History',
            ].map((r) => (
              <div key={r} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                <span className="text-gray-700 dark:text-gray-300">{r}</span>
                <Download className="h-3 w-3 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Quick Insights</h3>
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" />}
            title="Analytics dashboard coming soon"
            description="Interactive charts and data visualization will be available in the next phase."
          />
        </div>
      </div>
    </div>
  );
}
