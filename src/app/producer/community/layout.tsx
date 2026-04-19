import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderação",
  description: "Moderação da comunidade",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
