"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { useUserStore } from "@/stores/user-store";
import { ContextLockNotice } from "@/components/context-lock-notice";

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
    }
    // Trava de Contexto (§6b): os replaces silenciosos por role saíram —
    // não-admins agora veem o aviso renderizado abaixo, no lugar.
  }, [user, isLoading, authError, router, isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  const isAdminRole =
    user?.role === "ADMIN" || user?.role === "ADMIN_COLLABORATOR";
  if (isLoading || !user) {
    return null;
  }
  if (!isAdminRole) {
    const isStudentPure = user.role === "STUDENT" && !collaborator;
    return (
      <ContextLockNotice
        sessionLabel={
          isStudentPure
            ? "aluno"
            : user.role === "PRODUCER"
              ? "produtor"
              : "colaborador"
        }
        description="Este é o painel administrativo da plataforma. Sua sessão ativa não é de administrador."
        homeHref={isStudentPure ? "/" : "/producer"}
        homeLabel={
          isStudentPure
            ? "Ir para minha área de aluno"
            : "Ir para o painel do produtor"
        }
        loginHref="/admin/login"
      />
    );
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
