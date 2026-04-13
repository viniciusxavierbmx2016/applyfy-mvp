"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  students: number;
  courses: number;
  recentEnrollments: number;
  posts: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Total de Alunos",
      value: stats?.students ?? 0,
      href: "/admin/users",
    },
    {
      label: "Total de Cursos",
      value: stats?.courses ?? 0,
      href: "/admin/courses",
    },
    {
      label: "Matrículas (7 dias)",
      value: stats?.recentEnrollments ?? 0,
      href: "/admin/users",
    },
    {
      label: "Posts da Comunidade",
      value: stats?.posts ?? 0,
      href: "/admin/community",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard Admin</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 rounded-xl p-6 transition block"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{c.value}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
