import Image from "next/image";

import styles from "./BallVisual.module.css";

// Image fixe du ballon : affichée pendant le chargement de Three.js et quand
// WebGL n'est pas disponible.
export function BallVisual() {
  return (
    <Image
      className={styles.ball}
      src="/ball.svg"
      alt=""
      width={64}
      height={64}
      unoptimized
      preload
    />
  );
}
