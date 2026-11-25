"use client";

import { Button } from "./components/Button";
import styles from "./error.module.css";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <div className={styles.error} role="alert">
      <h1 className={styles.title}>Les matchs ne peuvent pas être chargés</h1>
      <p className={styles.message}>
        Un problème est survenu de notre côté. Réessayez dans quelques instants.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
