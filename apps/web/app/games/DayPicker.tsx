import { getAvailableDays, shiftDay } from "@repo/core";
import Link from "next/link";

import { classNames } from "../components/class-names";
import styles from "./DayPicker.module.css";
import { formatDayPill, formatLongDay } from "./format";

const VISIBLE_DAYS = 7;

export function dayHref(day: string): string {
  return `/?jour=${day}`;
}

interface DayPickerProps {
  // Jour affiché et jour actuel à Paris, au format AAAA-MM-JJ.
  selectedDay: string;
  today: string;
}

export function DayPicker({ selectedDay, today }: DayPickerProps) {
  const tomorrow = shiftDay(today, 1);
  const lastDayFromToday = shiftDay(today, VISIBLE_DAYS - 1);
  // Les dates AAAA-MM-JJ se comparent correctement comme des chaînes.
  const isInTodayWindow = selectedDay >= today && selectedDay <= lastDayFromToday;
  const { first, last } = getAvailableDays(today);
  // Les pastilles restent entre le premier et le dernier jour disponibles.
  const latestStart = shiftDay(last, -(VISIBLE_DAYS - 1));
  let firstDay = isInTodayWindow ? today : selectedDay;
  if (firstDay > latestStart) {
    firstDay = latestStart;
  }
  if (firstDay < first) {
    firstDay = first;
  }
  const days = Array.from({ length: VISIBLE_DAYS }, (_, index) => shiftDay(firstDay, index));

  function labels(day: string): { top: string; bottom: string; spoken: string } {
    const { weekday, dayNumber } = formatDayPill(day);
    const longDay = formatLongDay(day);
    if (day === today) {
      return { top: "Auj.", bottom: dayNumber, spoken: `Aujourd’hui, ${longDay}` };
    }
    if (day === tomorrow) {
      return { top: "Dem.", bottom: dayNumber, spoken: `Demain, ${longDay}` };
    }
    return { top: weekday, bottom: dayNumber, spoken: longDay };
  }

  return (
    <nav className={styles.picker} aria-label="Choisir un jour">
      <DayArrow
        targetDay={selectedDay > first ? shiftDay(selectedDay, -1) : null}
        label="Jour précédent"
        symbol="‹"
      />
      <ul className={styles.days}>
        {days.map((day) => {
          const { top, bottom, spoken } = labels(day);
          const isSelected = day === selectedDay;
          return (
            <li key={day}>
              <Link
                href={dayHref(day)}
                className={classNames(styles.day, isSelected && styles.selected)}
                aria-current={isSelected ? "date" : undefined}
              >
                <span className={styles.weekday} aria-hidden>
                  {top}
                </span>
                <span className={styles.dayNumber} aria-hidden>
                  {bottom}
                </span>
                <span className="visually-hidden">{spoken}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <DayArrow
        targetDay={selectedDay < last ? shiftDay(selectedDay, 1) : null}
        label="Jour suivant"
        symbol="›"
      />
    </nav>
  );
}

interface DayArrowProps {
  // null : on est sur la limite des jours disponibles, la flèche est désactivée.
  targetDay: string | null;
  label: string;
  symbol: string;
}

function DayArrow({ targetDay, label, symbol }: DayArrowProps) {
  if (targetDay === null) {
    return (
      <span
        className={classNames(styles.arrow, styles.arrowDisabled)}
        role="link"
        aria-disabled="true"
        aria-label={label}
      >
        <span aria-hidden>{symbol}</span>
      </span>
    );
  }
  return (
    <Link href={dayHref(targetDay)} className={styles.arrow} aria-label={label}>
      <span aria-hidden>{symbol}</span>
    </Link>
  );
}
