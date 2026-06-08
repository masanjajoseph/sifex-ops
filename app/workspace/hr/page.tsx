'use client';

import { UserCog, Users, Clock, CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';

export default function HRPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Human Resources"
        description="Manage employees, attendance, and HR operations"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'HR' }]}
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Employees" value="48" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Present Today" value="42" icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label="On Leave" value="4" icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Pending Onboarding" value="2" icon={<UserCog className="h-5 w-5" />} />
      </div>
      <EmptyState
        icon={<UserCog className="h-12 w-12" />}
        title="HR module ready"
        description="Employee management, attendance tracking, and payroll will be available in the next phase."
      />
    </div>
  );
}
