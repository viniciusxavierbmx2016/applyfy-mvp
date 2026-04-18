import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos · Members Club",
  description: "Gerenciamento de planos da plataforma",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
