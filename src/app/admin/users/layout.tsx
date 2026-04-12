import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usuários · Applyfy",
  description: "Gerenciamento de usuários e acessos",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
