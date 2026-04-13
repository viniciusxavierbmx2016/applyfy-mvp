"use client";

import dynamic from "next/dynamic";

const AdminAnalyticsContent = dynamic(
  () =>
    import("@/components/admin-analytics-content").then(
      (m) => m.AdminAnalyticsContent
    ),
  {
    ssr: false,
    loading: () => (
      <div className="p-6">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
      </div>
    ),
  }
);

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsContent />;
}
