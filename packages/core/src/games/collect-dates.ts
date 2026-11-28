import { shiftDay } from "./day";

const DAYS_BEFORE = 1;
const DAYS_AFTER = 7;

const newYorkDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Le calendrier de la NBA est daté à l'heure de New York.
export function getCurrentNewYorkDay(now: Date = new Date()): string {
  return newYorkDate.format(now);
}

// La veille est incluse : les matchs du soir à New York finissent souvent après minuit,
// et leur score final doit quand même être enregistré.
export function getCollectDates(now: Date = new Date()): string[] {
  const today = getCurrentNewYorkDay(now);
  const dates: string[] = [];
  for (let offset = -DAYS_BEFORE; offset <= DAYS_AFTER; offset++) {
    dates.push(shiftDay(today, offset));
  }
  return dates;
}

// Liste des dates de first à last, les deux incluses (vide si first est après last).
export function getDatesBetween(first: string, last: string): string[] {
  const dates: string[] = [];
  let date = first;
  while (date <= last) {
    dates.push(date);
    date = shiftDay(date, 1);
  }
  return dates;
}
