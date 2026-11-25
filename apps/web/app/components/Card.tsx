import type { CSSProperties, ReactNode } from "react";

import styles from "./Card.module.css";
import { classNames } from "./class-names";

// CSSProperties ne connaît pas les variables CSS : on l'élargit pour --card-accent.
type CardStyle = CSSProperties & Record<`--${string}`, string>;

interface CardProps {
  children: ReactNode;
  as?: "div" | "article" | "section" | "li";
  // Fond du liseré du haut (couleur ou dégradé CSS). Pas de liseré si absent.
  accent?: string;
  className?: string;
  "aria-label"?: string;
}

export function Card({ children, as: Element = "div", accent, className, ...rest }: CardProps) {
  const style: CardStyle | undefined =
    accent === undefined ? undefined : { "--card-accent": accent };

  return (
    <Element
      className={classNames(styles.card, accent !== undefined && styles.withAccent, className)}
      style={style}
      {...rest}
    >
      {children}
    </Element>
  );
}
