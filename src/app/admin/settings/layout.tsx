import type { Metadata } from "next";
import { SettingsTabs } from "./_tabs";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SettingsTabs />
      {children}
    </div>
  );
}
