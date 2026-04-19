import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assinaturas",
  description: "Gerenciamento de assinaturas dos produtores",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
