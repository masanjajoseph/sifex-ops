import { Package } from 'lucide-react';
import { ModulePage } from '@/components/workspace/ModulePage';

export const metadata = {
  title: 'Parcels | Sifex',
  description: 'Parcel and small package management',
};

export default function ParcelsPage() {
  return (
    <ModulePage
      title="Parcels"
      description="Track and manage individual parcels within shipments"
      icon={<Package className="h-12 w-12" />}
      breadcrumbs={[
        { label: 'Workspace', href: '/workspace' },
        { label: 'Parcels' },
      ]}
    >
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Parcel Tracking</h2>
        </div>
        <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Individual parcel tracking and management will be available once parcels are created through the acceptance workflow.
        </div>
      </div>
    </ModulePage>
  );
}
