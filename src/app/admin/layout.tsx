"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { useUserStore } from "@/stores/user-store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUserStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage || isLoading || !user) return;
    if (user.role === "STUDENT") {
      router.replace("/");
    } else if (user.role === "PRODUCER" || user.role === "COLLABORATOR") {
      router.replace("/producer");
    }
  }, [user, isLoading, router, isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  if (isLoading || !user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
