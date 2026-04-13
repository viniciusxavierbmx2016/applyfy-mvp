export default function Loading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto w-full animate-pulse">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-12 bg-gray-100 dark:bg-gray-900 rounded-xl" />
        <div className="h-12 bg-gray-100 dark:bg-gray-900 rounded-xl" />
        <div className="h-12 bg-gray-100 dark:bg-gray-900 rounded-xl" />
      </div>
    </div>
  );
}
