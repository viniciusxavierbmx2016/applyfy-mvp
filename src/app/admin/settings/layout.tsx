import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurações · Applyfy",
  description: "Configurações de integração e webhooks",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
