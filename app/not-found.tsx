import Link from 'next/link';
import { Package, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
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
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="mt-8">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
