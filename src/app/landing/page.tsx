import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://mymembersclub.com.br"),
  title: "Members Club — Crie sua área de membros",
  description:
    "Plataforma completa para criar e gerenciar sua área de membros. Cursos online, comunidade, certificados e muito mais.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://mymembersclub.com.br",
    siteName: "Members Club",
    title: "Members Club",
    description:
      "Plataforma completa para criar e gerenciar sua área de membros.",
    locale: "pt_BR",
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-center px-6">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Members Club
        </h1>
        <p className="mt-4 text-gray-400">Landing page em breve.</p>
      </div>
    </main>
  );
}
