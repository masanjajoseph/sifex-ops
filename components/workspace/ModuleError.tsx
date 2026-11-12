'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface ModuleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  moduleName: string;
}

function isChunkLoadError(error: Error): boolean {
  const message = error?.message || '';
  return (
    error?.name === 'ChunkLoadError' ||
    /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to load chunk/i.test(message)
  );
}

export function ModuleError({ error, reset, moduleName }: ModuleErrorProps) {
  const chunkError = isChunkLoadError(error);

  // A stale chunk happens when a new build is deployed while the tab is open.
  // The hashed file no longer exists, so re-rendering cannot recover — reload
  // once to pick up the new build instead of showing a dead end.
  useEffect(() => {
    if (!chunkError) return;
    const key = `chunk-reload:${window.location.pathname}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    window.location.reload();
  }, [chunkError]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-2xl shadow-red-500/20">
        <AlertTriangle className="h-10 w-10 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Error in {moduleName}</h1>
      <p className="mt-2 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
        {chunkError
          ? 'A new version of the app was deployed. Reload the page to continue.'
          : 'An unexpected error occurred. Please try again.'}
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => (chunkError ? window.location.reload() : reset())}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <a
          href="/workspace"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
