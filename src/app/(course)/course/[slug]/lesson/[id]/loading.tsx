export default function Loading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1200px] mx-auto w-full animate-pulse">
      <div className="aspect-video w-full rounded-xl bg-gray-900 dark:bg-gray-900 mb-6" />
      <div className="h-7 w-2/3 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
      <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    </div>
  );
}
