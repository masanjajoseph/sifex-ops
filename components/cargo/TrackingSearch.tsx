'use client';

import { useState } from 'react';
import { Search, MapPin, Package, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrackingTimeline, TrackingTimelineSkeleton } from './TrackingTimeline';
import { EmptyState } from '@/components/ui/EmptyState';

interface TrackingResult {
  entityType: string;
  entityId: string;
  events: Array<{
    id: string;
    eventType: string;
    title: string;
    description?: string | null;
    status?: string;
    userId?: string;
    stationId?: string;
    scanSource?: string;
    remarks?: string | null;
    createdAt: string | Date;
  }>;
}

export function TrackingSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError('');

    try {
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(query.trim())}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        setError('Failed to fetch tracking data');
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const entityIcon = result?.entityType === 'MasterAWB'
    ? <PackageCheck className="h-5 w-5 text-blue-500" />
    : result?.entityType === 'HouseAWB'
      ? <Package className="h-5 w-5 text-green-500" />
      : <MapPin className="h-5 w-5 text-purple-500" />;

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter tracking number (e.g. SFX-MAWB-DAR-20260526-0001)"
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : 'Track'}
        </Button>
      </div>

      {/* Loading state */}
      {loading && <TrackingTimelineSkeleton />}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Not found */}
      {notFound && (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="Tracking number not found"
          description={`No shipment found with tracking number "${query}". Please verify the number and try again.`}
        />
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/50">
              {entityIcon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {result.entityType === 'MasterAWB' ? 'Master Air Waybill' :
                 result.entityType === 'HouseAWB' ? 'House Air Waybill' :
                 'Parcel'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {result.events.length} tracking event{result.events.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <TrackingTimeline events={result.events} />
        </div>
      )}
    </div>
  );
}
