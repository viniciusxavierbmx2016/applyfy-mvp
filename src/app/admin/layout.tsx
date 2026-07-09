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
  const { user, collaborator, isLoading, authError } = useUserStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage || isLoading || authError) return;
    // 4.3/4.4: logged-out (stale cookie let the middleware through) → login.
    // The AuthProvider already cleared the cookie on the 401, so this replace
    // lands on /admin/login and stays (no ping-pong).
    if (!user) {
      router.replace("/admin/login");
      return;
    }
    // C6: STUDENT with Collaborator row goes to /producer (workspace
    // collab work) like a regular COLLABORATOR. Pure students go to /.
    if (user.role === "STUDENT") {
      router.replace(collaborator ? "/producer" : "/");
    } else if (user.role === "PRODUCER" || user.role === "COLLABORATOR") {
      router.replace("/producer");
    }
  }, [user, collaborator, isLoading, authError, router, isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  const isAdminRole =
    user?.role === "ADMIN" || user?.role === "ADMIN_COLLABORATOR";
  if (isLoading || !user || !isAdminRole) {
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
