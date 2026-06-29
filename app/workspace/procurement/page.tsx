'use client';

import { ShoppingCart, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

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
      <EmptyState
        icon={<ShoppingCart className="h-12 w-12" />}
        title="Procurement module ready"
        description="Purchase order management will be available in the next phase."
      />
    </div>
  );
}
