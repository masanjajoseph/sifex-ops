export default function WorkspaceLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-2 h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="space-y-4 p-5">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                  <div className="flex-1">
                    <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="mt-1 h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
