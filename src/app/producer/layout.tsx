"use client";

import { usePathname } from "next/navigation";
import { ProducerThemeProvider } from "@/components/producer-theme-provider";
import { ProducerShell } from "@/components/producer-shell";

export default function ProducerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage =
    pathname?.startsWith("/producer/login") ||
    pathname?.startsWith("/producer/register");

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <ProducerThemeProvider>
      <ProducerShell>{children}</ProducerShell>
    </ProducerThemeProvider>
  );
}
