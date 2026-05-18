import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta de produtor no Members Club",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
