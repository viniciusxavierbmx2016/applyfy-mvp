import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assinatura · Members Club",
  description: "Gerencie seu plano e pagamentos",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
