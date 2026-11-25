import styles from "./Footer.module.css";

interface FooterProps {
  inert?: boolean;
}

export function Footer({ inert = false }: FooterProps) {
  return (
    <footer className={styles.footer} inert={inert}>
      <p className={styles.brand}>PronoLeague</p>
      <p>Données : BALLDONTLIE</p>
    </footer>
  );
}
