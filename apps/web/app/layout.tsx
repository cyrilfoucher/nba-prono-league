import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";

import { AppShell } from "./components/AppShell";
import "./globals.css";
import { parseTheme, THEME_COOKIE_NAME, themeAttribute } from "./theme/theme";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "PronoLeague",
  description:
    "Pronostiquez les matchs NBA de la nuit entre amis, gagnez des points et comparez-vous dans vos ligues privées.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Lire le cookie ici pose data-theme dès le HTML envoyé : aucun éclair de couleur.
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html lang="fr" className={geistSans.variable} data-theme={themeAttribute(theme)}>
      <body>
        <AppShell initialTheme={theme}>{children}</AppShell>
      </body>
    </html>
  );
}
