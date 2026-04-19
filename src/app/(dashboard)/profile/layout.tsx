import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meu Perfil",
  description: "Seu progresso, pontos e cursos",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
