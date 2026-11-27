export interface TeamColors {
  // Fond du badge et liseré des cartes.
  primary: string;
  // Contour du badge.
  secondary: string;
  // Couleur du texte posé sur la couleur primaire.
  text: string;
}

interface TeamPalette {
  primary: string;
  secondary: string;
  // Texte imposé ; sinon, la seconde couleur si elle est lisible, ou du blanc ou du noir.
  text?: string;
}

const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#111111";
// Contraste minimal recommandé (WCAG AA) pour du petit texte.
const MIN_CONTRAST = 4.5;

const TEAM_PALETTES: Record<string, TeamPalette> = {
  ATL: { primary: "#E03A3E", secondary: "#FDB927" },
  BOS: { primary: "#007A33", secondary: "#BA9653" },
  BKN: { primary: "#000000", secondary: "#FFFFFF" },
  // Choix validés par Cyril : le nom complet est toujours écrit à côté du badge,
  // qui sert de logo ; un contraste un peu sous le seuil reste acceptable.
  CHA: { primary: "#1D1160", secondary: "#00788C", text: "#00788C" },
  CHI: { primary: "#CE1141", secondary: "#FFFFFF", text: "#000000" },
  CLE: { primary: "#860038", secondary: "#FDBB30" },
  DAL: { primary: "#00538C", secondary: "#B8C4CA" },
  DEN: { primary: "#0E2240", secondary: "#FEC524" },
  DET: { primary: "#1D42BA", secondary: "#C8102E" },
  GSW: { primary: "#1D428A", secondary: "#FFC72C" },
  HOU: { primary: "#CE1141", secondary: "#C4CED4" },
  IND: { primary: "#002D62", secondary: "#FDBB30" },
  LAC: { primary: "#C8102E", secondary: "#1D428A" },
  LAL: { primary: "#552583", secondary: "#FDB927" },
  MEM: { primary: "#5D76A9", secondary: "#12173F" },
  MIA: { primary: "#000000", secondary: "#98002E" },
  MIL: { primary: "#00471B", secondary: "#EEE1C6" },
  MIN: { primary: "#0C2340", secondary: "#78BE20" },
  NOP: { primary: "#0C2340", secondary: "#85714D" },
  NYK: { primary: "#F58426", secondary: "#006BB6", text: "#000000" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24" },
  ORL: { primary: "#0077C0", secondary: "#C4CED4" },
  PHI: { primary: "#006BB6", secondary: "#ED174C" },
  PHX: { primary: "#E56020", secondary: "#1D1160" },
  POR: { primary: "#E03A3E", secondary: "#000000" },
  SAC: { primary: "#5A2D81", secondary: "#63727A" },
  SAS: { primary: "#C4CED4", secondary: "#000000" },
  TOR: { primary: "#753BBD", secondary: "#CE1141" },
  UTA: { primary: "#4B2C83", secondary: "#00AEEF" },
  WAS: { primary: "#002B5C", secondary: "#E31837" },
};

// Équipe inconnue : le gris vient de globals.css (clair et sombre) ; le texte blanc y
// reste lisible dans les deux thèmes.
const FALLBACK: TeamColors = {
  primary: "var(--color-team-fallback)",
  secondary: "var(--color-border)",
  text: LIGHT_TEXT,
};

// Luminance relative selon la définition WCAG 2.
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [red = 0, green = 0, blue = 0] = channels;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: number, second: number): number {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function readableTextOn(background: string): string {
  const luminance = relativeLuminance(background);
  const withLight = contrastRatio(luminance, relativeLuminance(LIGHT_TEXT));
  const withDark = contrastRatio(luminance, relativeLuminance(DARK_TEXT));
  return withLight >= withDark ? LIGHT_TEXT : DARK_TEXT;
}

function textColor({ primary, secondary, text }: TeamPalette): string {
  if (text !== undefined) {
    return text;
  }
  const contrast = contrastRatio(relativeLuminance(primary), relativeLuminance(secondary));
  return contrast >= MIN_CONTRAST ? secondary : readableTextOn(primary);
}

export function getTeamColors(abbreviation: string): TeamColors {
  const palette = TEAM_PALETTES[abbreviation];
  if (palette === undefined) {
    return FALLBACK;
  }
  return { primary: palette.primary, secondary: palette.secondary, text: textColor(palette) };
}
