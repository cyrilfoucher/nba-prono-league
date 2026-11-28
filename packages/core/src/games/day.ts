const PARIS_TIME_ZONE = "Europe/Paris";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const parisDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARIS_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Écart entre l'heure de Paris et l'heure UTC à un instant donné : +1 h en hiver, +2 h en été.
function getParisOffsetMs(instant: Date): number {
  const parts = Object.fromEntries(
    parisDateTime.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const parisAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return parisAsUtc - instant.getTime();
}

// Le décalage est mesuré à minuit UTC et non à minuit heure de Paris.
// C'est le même : en Europe, le changement d'heure a lieu à 01:00 UTC,
// donc jamais entre minuit à Paris (22:00 ou 23:00 UTC la veille) et minuit UTC.
// Ce raccourci ne vaudrait pas pour un autre fuseau horaire.
function getParisMidnight(date: string): Date {
  const midnightUtc = new Date(`${date}T00:00:00Z`);
  return new Date(midnightUtc.getTime() - getParisOffsetMs(midnightUtc));
}

export function shiftDay(date: string, days: number): string {
  const noon = new Date(`${date}T12:00:00Z`);
  return new Date(noon.getTime() + days * ONE_DAY_MS).toISOString().slice(0, 10);
}

// Un jour de Paris va de minuit à minuit, heure de Paris (23 h ou 25 h les jours de changement d'heure).
export function getParisDayRange(date: string): { start: Date; end: Date } {
  return { start: getParisMidnight(date), end: getParisMidnight(shiftDay(date, 1)) };
}

export function getCurrentParisDay(now: Date = new Date()): string {
  return parisDateTime.format(now).slice(0, 10);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Vérifie qu'une chaîne est une date réelle au format AAAA-MM-JJ.
export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  // Une date inexistante (2026-02-31) est décalée au mois suivant par Date.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Saison régulière NBA 2026-2027 (dates de New York) : à mettre à jour à chaque nouvelle saison.
export const SEASON_START = "2026-10-20";
export const REGULAR_SEASON_END = "2027-04-11";
// La collecte automatique récupère les matchs jusqu'à 7 jours à l'avance.
const DAYS_AHEAD = 7;

// Jours que l'on peut afficher : du début de la saison jusqu'à 7 jours après aujourd'hui.
export function getAvailableDays(today: string): { first: string; last: string } {
  return { first: SEASON_START, last: shiftDay(today, DAYS_AHEAD) };
}

// Vérifie qu'un jour est une date valide comprise dans les jours disponibles.
export function isAvailableDay(day: string, today: string): boolean {
  if (!isValidDate(day)) {
    return false;
  }
  const { first, last } = getAvailableDays(today);
  // Les dates AAAA-MM-JJ se comparent correctement comme des chaînes.
  return day >= first && day <= last;
}
