import Link from 'next/link';
import { Plane, Package, Warehouse, MapPin, LayoutGrid, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Animated Cargo Illustration */}
        <div className="relative mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-24 w-24 animate-pulse rounded-2xl bg-gradient-to-br from-red-500 to-red-700 p-5 shadow-2xl shadow-red-500/20">
                <Package className="h-full w-full text-white" />
              </div>
              <div className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg ring-4 ring-gray-50 dark:ring-gray-950">
                404
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="mb-2 h-1.5 w-32 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="h-1.5 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" style={{ animationDelay: '0.2s' }} />
            </div>
            <div className="hidden sm:block">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                <Search className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Page Not Found
        </h1>
        <p className="mt-3 max-w-md text-center text-gray-600 dark:text-gray-400">
          This cargo route doesn&apos;t exist in our system. The page may have been moved, 
          deleted, or the link might be incorrect.
        </p>

        {/* Recovery Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-blue-600/30"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <Link
            href="/workspace/export"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Package className="h-4 w-4" />
            Shipments
          </Link>
          <Link
            href="/workspace/warehouse"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Warehouse className="h-4 w-4" />
            Warehouse
          </Link>
          <Link
            href="/workspace/tracking"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <MapPin className="h-4 w-4" />
            Tracking
          </Link>
        </div>

        {/* Workspace Shortcuts */}
        <div className="mt-12 w-full max-w-lg">
          <h3 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Recent Workspace Shortcuts
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link
              href="/workspace"
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <LayoutGrid className="h-5 w-5 text-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Dashboard</span>
            </Link>
            <Link
              href="/workspace/flights"
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <Plane className="h-5 w-5 text-purple-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Flights</span>
            </Link>
            <Link
              href="/workspace/billing"
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M3.75 6v9.75M12 6v9.75m-8.25-9.75v9.75m0 0v.375c0 .621.504 1.125 1.125 1.125h13.5a1.125 1.125 0 001.125-1.125v-.375" />
              </svg>
              <span className="text-xs text-gray-600 dark:text-gray-400">Billing</span>
            </Link>
            <Link
              href="/workspace/reports"
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <span className="text-xs text-gray-600 dark:text-gray-400">Reports</span>
            </Link>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-16 flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500">
          <div className="h-px w-8 bg-gray-200 dark:bg-gray-800" />
          <span className="font-medium">Sifex Cargo ERP</span>
          <div className="h-px w-8 bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}
