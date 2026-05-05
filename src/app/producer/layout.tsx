"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { SubscriptionGate } from "@/components/subscription-gate";
import { ProducerThemeProvider } from "@/components/producer-theme-provider";

const ProducerTour = dynamic(
  () =>
    import("@/components/producer-tour").then((m) => ({
      default: m.ProducerTour,
    })),
  { ssr: false }
);

const SupportChatWidget = dynamic(
  () =>
    import("@/components/support-chat-widget").then((m) => ({
      default: m.SupportChatWidget,
    })),
  { ssr: false }
);

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
      <div className="producer-layout min-h-screen bg-white dark:bg-[var(--producer-bg,#0a0a1a)] flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 p-4 lg:p-6">
            <SubscriptionGate>
              <ProducerTour />
              {children}
            </SubscriptionGate>
          </main>
        </div>

        <SupportChatWidget />
      </div>
    </ProducerThemeProvider>
  );
}
