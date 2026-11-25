import type { Metadata } from "next";
import localFont from "next/font/local";

import { AppShell } from "./components/AppShell";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "PronoLeague",
  description:
    "Pronostiquez les matchs NBA de la nuit entre amis, gagnez des points et comparez-vous dans vos ligues privées.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={geistSans.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
