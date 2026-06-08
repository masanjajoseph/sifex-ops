import Link from 'next/link';
import { ArrowLeft, Package, Warehouse, MapPin } from 'lucide-react';

export default function WorkspaceNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-2xl shadow-red-500/20">
          <Package className="h-10 w-10 text-white" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white ring-4 ring-gray-50 dark:ring-gray-950">
          404
        </div>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Page Not Found</h1>
      <p className="mt-2 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
        The module or page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/workspace"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/workspace/export"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Package className="h-4 w-4" />
          Shipments
        </Link>
        <Link
          href="/workspace/warehouse"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Warehouse className="h-4 w-4" />
          Warehouse
        </Link>
        <Link
          href="/workspace/tracking"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <MapPin className="h-4 w-4" />
          Tracking
        </Link>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/workspace/customers"
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Customers
        </Link>
        <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
        <Link
          href="/workspace/billing"
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Billing
        </Link>
        <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
        <Link
          href="/workspace/reports"
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Reports
        </Link>
        <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
        <Link
          href="/workspace/settings"
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
