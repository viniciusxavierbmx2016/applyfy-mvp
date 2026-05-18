"use client";

import { ProducerThemeProvider } from "@/components/producer-theme-provider";
import { ProducerShell } from "@/components/producer-shell";

export default function ProducerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProducerThemeProvider>
      <ProducerShell>{children}</ProducerShell>
    </ProducerThemeProvider>
  );
}
