"use client";

import Link from "next/link";
import { useEffect, useRef, type ComponentType, type CSSProperties, type SVGProps } from "react";

import { classNames } from "./class-names";
import { GamesIcon, LeaguesIcon, PicksIcon, ProfileIcon, RankingsIcon } from "./icons";
import styles from "./Menu.module.css";

interface MenuItem {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  // Rubrique pas encore disponible quand href est absent.
  href?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Matchs", Icon: GamesIcon, href: "/" },
  { label: "Mes ligues", Icon: LeaguesIcon },
  { label: "Classements", Icon: RankingsIcon },
  { label: "Mes pronos", Icon: PicksIcon },
  { label: "Profil", Icon: ProfileIcon },
];

type ItemStyle = CSSProperties & Record<`--${string}`, number>;

interface MenuProps {
  id: string;
  open: boolean;
  currentPath: string;
  // Appelée après un clic sur un lien du menu.
  onNavigate: () => void;
}

export function Menu({ id, open, currentPath, onNavigate }: MenuProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (open) {
      firstLinkRef.current?.focus();
    }
  }, [open]);

  return (
    <div id={id} className={classNames(styles.menu, open && styles.open)} inert={!open}>
      <nav aria-label="Menu principal" className={styles.nav}>
        <ul className={styles.list}>
          {MENU_ITEMS.map(({ label, Icon, href }, index) => {
            const style: ItemStyle = { "--item-index": index };
            return (
              <li key={label} className={styles.item} style={style}>
                {href === undefined ? (
                  <span className={classNames(styles.entry, styles.disabled)}>
                    <Icon className={styles.icon} />
                    <span className={styles.label}>{label}</span>
                    <span className={styles.soon}>Bientôt</span>
                  </span>
                ) : (
                  <Link
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={href}
                    className={styles.entry}
                    aria-current={currentPath === href ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <Icon className={styles.icon} />
                    <span className={styles.label}>{label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
