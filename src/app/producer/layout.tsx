"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { SubscriptionGate } from "@/components/subscription-gate";
import { ProducerThemeProvider } from "@/components/producer-theme-provider";

export default function ProducerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (
    pathname === "/producer/login" ||
    pathname === "/producer/register"
  ) {
    return <>{children}</>;
  }

  return (
    <ProducerThemeProvider>
      <div className="min-h-screen bg-white dark:bg-[var(--producer-bg,#0a0a1a)] flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 p-4 lg:p-6">
            <SubscriptionGate>
              {children}
            </SubscriptionGate>
          </main>
        </div>
      </div>
    </ProducerThemeProvider>
  );
}
