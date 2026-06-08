'use client';

import { Users, Shield, RefreshCw, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage user accounts, roles, and permissions"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'User Management' }]}
        action={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add User
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Users" value="24" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active Sessions" value="3" icon={<Shield className="h-5 w-5" />} />
        <StatCard label="Roles Defined" value="15" icon={<Shield className="h-5 w-5" />} />
      </div>
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="User management ready"
        description="User and role administration will be fully available in the next phase."
      />
    </div>
  );
}
