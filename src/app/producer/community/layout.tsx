import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderação · Members Club",
  description: "Moderação da comunidade",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
