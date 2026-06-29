'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';

interface CustomsItem {
  id: string;
  declarationNumber: string;
  declarationType: string;
  status: string;
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  submittedAt: string;
  createdAt: string;
}

export default function CustomsPage() {
  const [data, setData] = useState<CustomsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customs?limit=50');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => ({
    underReview: data.filter((d) => d.status === 'UNDER_REVIEW').length,
    onHold: data.filter((d) => d.status === 'CUSTOMS_HOLD').length,
    cleared: data.filter((d) => d.status === 'APPROVED' || d.status === 'RELEASED').length,
    total: data.length,
  }), [data]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'CUSTOMS_HOLD': return 'bg-red-500';
      case 'CUSTOMS_QUERY': return 'bg-yellow-500';
      case 'UNDER_REVIEW': return 'bg-blue-500';
      case 'APPROVED': case 'RELEASED': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const badgeStatus = (status: string) => {
    switch (status) {
      case 'CUSTOMS_HOLD': return 'error' as const;
      case 'CUSTOMS_QUERY': return 'warning' as const;
      case 'UNDER_REVIEW': return 'info' as const;
      case 'APPROVED': case 'RELEASED': return 'success' as const;
      default: return 'pending' as const;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customs Operations"
        description="Manage customs clearance, declarations, and compliance"
        breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Customs' }]}
        action={
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Under Review" value={stats.underReview} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Customs Hold" value={stats.onHold} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Cleared Today" value={stats.cleared} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Total Declarations" value={stats.total} icon={<Shield className="h-5 w-5" />} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-12 w-12" />}
          title="No customs declarations"
          description="All shipments are up to date with customs."
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Active Declarations</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${statusColor(d.status)}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{d.declarationNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{d.originCountry} → {d.destinationCountry} · {d.declarationType}</p>
                  </div>
                </div>
                <StatusBadge status={badgeStatus(d.status)} label={d.status.replace(/_/g, ' ')} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
