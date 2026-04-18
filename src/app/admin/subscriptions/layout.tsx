import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assinaturas · Members Club",
  description: "Gerenciamento de assinaturas dos produtores",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
