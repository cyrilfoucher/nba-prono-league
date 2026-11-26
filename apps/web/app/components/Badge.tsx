import type { CSSProperties } from "react";

import styles from "./Badge.module.css";
import { classNames } from "./class-names";

interface BadgeProps {
  label: string;
  background: string;
  color: string;
  // Couleur du contour ; sans elle, le contour reste celui du thème.
  borderColor?: string;
  // À activer quand le même texte est déjà lisible à côté de la pastille.
  decorative?: boolean;
  className?: string;
}

export function Badge({
  label,
  background,
  color,
  borderColor,
  decorative = false,
  className,
}: BadgeProps) {
  const style: CSSProperties = { background, color };
  if (borderColor !== undefined) {
    style.borderColor = borderColor;
    style.borderWidth = "2px";
  }
  return (
    <span
      className={classNames(styles.badge, className)}
      style={style}
      aria-hidden={decorative || undefined}
    >
      {label}
    </span>
  );
}
