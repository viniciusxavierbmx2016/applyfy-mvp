import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cursos · Admin Applyfy",
  description: "Gerenciamento de cursos",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
