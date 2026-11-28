"use client";

import { useState } from "react";

import { THEME_COOKIE_NAME, THEME_LABELS, THEMES, themeAttribute, type Theme } from "./theme";
import styles from "./ThemeSwitcher.module.css";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

interface ThemeSwitcherProps {
  // Thème lu dans le cookie par le layout, pour que le bon bouton soit coché dès le rendu serveur.
  initialTheme: Theme;
}

function applyTheme(theme: Theme) {
  const attribute = themeAttribute(theme);
  if (attribute === undefined) {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = attribute;
  }
  // En local (http), un cookie secure serait refusé par le navigateur.
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax${secure}`;
}

export function ThemeSwitcher({ initialTheme }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState(initialTheme);

  function handleChange(nextTheme: Theme) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <fieldset className={styles.switcher}>
      <legend className={styles.legend}>Thème</legend>
      <div className={styles.options}>
        {THEMES.map((option) => (
          <label key={option} className={styles.option}>
            <input
              type="radio"
              name="theme"
              value={option}
              checked={theme === option}
              onChange={() => handleChange(option)}
              className={styles.input}
            />
            <span className={styles.text}>{THEME_LABELS[option]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
