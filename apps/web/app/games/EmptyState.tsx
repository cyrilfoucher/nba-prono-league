import { Button } from "../components/Button";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  // Lien de retour vers aujourd'hui, absent si on affiche déjà aujourd'hui.
  todayHref?: string;
}

export function EmptyState({ todayHref }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.message}>Aucun match ce jour-là</p>
      {todayHref !== undefined && (
        <Button href={todayHref} variant="secondary">
          Voir les matchs d’aujourd’hui
        </Button>
      )}
    </div>
  );
}
