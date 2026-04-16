"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

const ADMIN_FAVICON = "/applyfy-logo.png?v=2";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Force the Applyfy favicon while inside /admin/*. The root layout already
  // emits it, but browsers aggressively cache the last-seen favicon per tab —
  // if the admin previously visited /w/<slug> with a workspace favicon, the
  // tab would keep that icon until re-fetched. Writing the href on every
  // admin render pushes the correct icon back into the DOM.
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (link.href.endsWith(ADMIN_FAVICON) === false) {
      link.href = ADMIN_FAVICON;
    }
  }, [pathname]);

  // Auth routes inside /admin/* should render without the staff shell.
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
