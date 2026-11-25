"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

import styles from "./AppShell.module.css";
import { Footer } from "./Footer";
import { Header } from "./Header";

interface AppShellProps {
  children: ReactNode;
}

// Garde l'état du menu au-dessus de l'en-tête, du contenu et du pied de page : quand
// le menu est ouvert, le contenu et le pied de page deviennent inertes (ni clic ni
// focus clavier), seul l'en-tête reste accessible.
export function AppShell({ children }: AppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);
  // Fonction stable : l'en-tête s'en sert dans un effet sans le relancer à chaque rendu.
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  // Changement de page (lien ou retour arrière) : on referme le menu.
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setIsMenuOpen(false);
  }

  return (
    <>
      <Header
        isMenuOpen={isMenuOpen}
        currentPath={pathname}
        onToggleMenu={() => setIsMenuOpen((open) => !open)}
        onCloseMenu={closeMenu}
      />
      <main className={styles.main} inert={isMenuOpen}>
        {children}
      </main>
      <Footer inert={isMenuOpen} />
    </>
  );
}
