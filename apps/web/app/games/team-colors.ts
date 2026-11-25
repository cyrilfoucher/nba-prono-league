export interface TeamColors {
  primary: string;
  // Couleur du texte posé sur la couleur primaire (badge).
  text: string;
}

const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#111111";

const PRIMARY_COLORS: Record<string, string> = {
  ATL: "#E03A3E",
  BOS: "#007A33",
  BKN: "#000000",
  CHA: "#1D1160",
  CHI: "#CE1141",
  CLE: "#860038",
  DAL: "#00538C",
  DEN: "#0E2240",
  DET: "#C8102E",
  GSW: "#1D428A",
  HOU: "#CE1141",
  IND: "#002D62",
  LAC: "#C8102E",
  LAL: "#552583",
  MEM: "#5D76A9",
  MIA: "#98002E",
  MIL: "#00471B",
  MIN: "#0C2340",
  NOP: "#0C2340",
  NYK: "#006BB6",
  OKC: "#007AC1",
  ORL: "#0077C0",
  PHI: "#006BB6",
  PHX: "#1D1160",
  POR: "#E03A3E",
  SAC: "#5A2D81",
  SAS: "#C4CED4",
  TOR: "#CE1141",
  UTA: "#4B2C83",
  WAS: "#002B5C",
};

// Équipe inconnue : le gris vient de globals.css (clair et sombre) ; le texte blanc y
// reste lisible dans les deux thèmes.
const FALLBACK: TeamColors = { primary: "var(--color-team-fallback)", text: LIGHT_TEXT };

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

export function getTeamColors(abbreviation: string): TeamColors {
  const primary = PRIMARY_COLORS[abbreviation];
  return primary === undefined ? FALLBACK : { primary, text: readableTextOn(primary) };
}
