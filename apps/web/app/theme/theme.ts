export const THEMES = ["system", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE_NAME = "theme";

export const THEME_LABELS: Record<Theme, string> = {
  system: "Système",
  light: "Clair",
  dark: "Sombre",
};

// Un cookie absent ou modifié à la main retombe sur le thème du système.
export function parseTheme(value: string | undefined): Theme {
  return THEMES.find((theme) => theme === value) ?? "system";
}

// En position Système, pas d'attribut : le navigateur suit le réglage du système.
export function themeAttribute(theme: Theme): "light" | "dark" | undefined {
  return theme === "system" ? undefined : theme;
}
