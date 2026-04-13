export default function Loading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto w-full animate-pulse">
      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
      <div className="h-32 w-full rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 mb-3"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-2 w-1/4 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
