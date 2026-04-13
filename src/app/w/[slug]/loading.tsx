export default function Loading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="aspect-video bg-gray-200 dark:bg-gray-800" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
