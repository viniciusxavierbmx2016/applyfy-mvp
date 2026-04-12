import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar · Applyfy",
  description: "Acesse sua área de membros Applyfy",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
