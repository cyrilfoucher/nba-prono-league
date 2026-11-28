"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { Theme } from "../theme/theme";
import { MenuBall } from "./ball/MenuBall";
import { Button } from "./Button";
import { classNames } from "./class-names";
import styles from "./Header.module.css";
import { Menu } from "./Menu";

const MENU_ID = "main-menu";

interface HeaderProps {
  isMenuOpen: boolean;
  currentPath: string;
  initialTheme: Theme;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
}

export function Header({
  isMenuOpen,
  currentPath,
  initialTheme,
  onToggleMenu,
  onCloseMenu,
}: HeaderProps) {
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Ferme le menu et remet le focus sur son bouton, pour ne pas perdre l'utilisateur
  // au clavier quand le menu disparaît.
  function closeMenuAndFocusButton() {
    onCloseMenu();
    menuButtonRef.current?.focus();
  }

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseMenu();
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      root.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, onCloseMenu]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} onClick={onCloseMenu}>
            Prono<span className={styles.logoAccent}>League</span>
          </Link>
          <Button
            ref={menuButtonRef}
            variant="icon"
            className={classNames(styles.menuButton, isMenuOpen && styles.menuButtonOpen)}
            aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isMenuOpen}
            aria-controls={MENU_ID}
            onClick={onToggleMenu}
          >
            <MenuBall isMenuOpen={isMenuOpen} />
          </Button>
        </div>
      </header>
      <Menu
        id={MENU_ID}
        open={isMenuOpen}
        currentPath={currentPath}
        initialTheme={initialTheme}
        onNavigate={closeMenuAndFocusButton}
      />
    </>
  );
}
