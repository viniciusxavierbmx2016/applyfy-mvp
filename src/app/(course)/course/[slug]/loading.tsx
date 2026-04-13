export default function Loading() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1400px] mx-auto w-full animate-pulse">
      <div className="aspect-[21/9] sm:aspect-[21/7] rounded-2xl bg-gray-200 dark:bg-gray-800 mb-6" />
      <div className="h-8 w-2/3 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded mb-2" />
      <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-800 rounded mb-8" />
      {Array.from({ length: 2 }).map((_, m) => (
        <div key={m} className="mb-8">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-40 sm:w-48 aspect-[4/5] rounded-xl bg-gray-200 dark:bg-gray-800 flex-shrink-0"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
