'use client';

import { ShoppingCart, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

const mockPOs = [
  { id: 'PO-001', vendor: 'Airline Supplies Ltd', amount: 12500, status: 'APPROVED' as const },
  { id: 'PO-002', vendor: 'Warehouse Equipment Co', amount: 8400, status: 'PENDING' as const },
];

export default function ProcurementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        description="Manage vendors, purchase orders, and supply chain"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Procurement' }]}
        action={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> New Purchase Order
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Orders" value={mockPOs.length} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard label="Pending Approval" value={mockPOs.filter(p => p.status === 'PENDING').length} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard label="Total Value" value={`$${(mockPOs.reduce((a, p) => a + p.amount, 0)).toLocaleString()}`} icon={<ShoppingCart className="h-5 w-5" />} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {mockPOs.map((po) => (
            <div key={po.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{po.vendor}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{po.id}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">${po.amount.toLocaleString()}</span>
                <StatusBadge status={po.status === 'APPROVED' ? 'success' : 'warning'} label={po.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
