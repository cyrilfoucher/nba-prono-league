import type { GameStatus } from "@repo/core";

import { classNames } from "../components/class-names";
import styles from "./GameStatusLabel.module.css";

const LABELS: Record<GameStatus, string> = {
  scheduled: "À venir",
  in_progress: "En direct",
  final: "Terminé",
  postponed: "Reporté",
  canceled: "Annulé",
};

interface GameStatusLabelProps {
  status: GameStatus;
  // Heure de Paris déjà formatée, affichée devant « À venir ».
  time: string;
}

export function GameStatusLabel({ status, time }: GameStatusLabelProps) {
  return (
    <span className={classNames(styles.status, styles[status])}>
      {status === "in_progress" && <span className={styles.liveDot} aria-hidden />}
      {status === "scheduled" && <span className={styles.time}>{time}</span>}
      {LABELS[status]}
    </span>
  );
}
