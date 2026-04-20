import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Members Club",
    template: "%s | Members Club",
  },
  description:
    "Plataforma completa para criar e gerenciar sua area de membros. Cursos online, comunidade, certificados e muito mais.",
  keywords: [
    "area de membros",
    "cursos online",
    "plataforma de cursos",
    "members club",
    "infoproduto",
  ],
  authors: [{ name: "Members Club" }],
  creator: "Members Club",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://app.mymembersclub.com.br"
  ),
  icons: { icon: "/logo.png" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Members Club",
    title: "Members Club",
    description:
      "Plataforma completa para criar e gerenciar sua area de membros.",
  },
  twitter: {
    card: "summary",
    title: "Members Club",
    description:
      "Plataforma completa para criar e gerenciar sua area de membros.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <DynamicFavicon />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900 dark:bg-gray-950 dark:text-white`}
      >
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
