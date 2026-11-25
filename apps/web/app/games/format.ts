const PARIS = "Europe/Paris";

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS,
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const longDateFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const pillFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS,
  weekday: "short",
  day: "numeric",
});

// Midi UTC tombe toujours le même jour à Paris (UTC+1 ou UTC+2).
function dayToDate(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

// « 21:30 »
export function formatTime(date: Date): string {
  return timeFormat.format(date);
}

// « mer. 26 nov. »
export function formatShortDate(date: Date): string {
  return shortDateFormat.format(date);
}

// « mercredi 26 novembre 2026 »
export function formatLongDay(day: string): string {
  return longDateFormat.format(dayToDate(day));
}

// « mer. » et « 26 » séparés pour la pastille du sélecteur de jour.
export function formatDayPill(day: string): { weekday: string; dayNumber: string } {
  const parts = pillFormat.formatToParts(dayToDate(day));
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const dayNumber = parts.find((part) => part.type === "day")?.value ?? "";
  return { weekday, dayNumber };
}
