import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mymembersclub.com.br"),
  title: {
    absolute: "Members Club — A Plataforma de Área de Membros Premium",
  },
  description:
    "Plataforma 100% brasileira para criar e gerenciar sua área de membros. 50+ funcionalidades, vitrine Netflix, comunidade, gamificação e checkout — R$ 597/mês.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://mymembersclub.com.br",
    siteName: "Members Club",
    title: "Members Club — A Plataforma de Área de Membros Premium",
    description:
      "Plataforma 100% brasileira para criar e gerenciar sua área de membros.",
    locale: "pt_BR",
    images: [
      {
        url: "https://mymembersclub.com.br/og-image.png",
        width: 1200,
        height: 630,
        alt: "Members Club — A área de membros premium do Brasil",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Members Club — A Plataforma de Área de Membros Premium",
    description:
      "Plataforma 100% brasileira para criar e gerenciar sua área de membros.",
    images: ["https://mymembersclub.com.br/og-image.png"],
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${outfit.variable} ${jakarta.variable} ${instrument.variable}`}>
      {children}
    </div>
  );
}
