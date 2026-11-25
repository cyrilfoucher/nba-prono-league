import { getCurrentParisDay, isValidDate } from "@repo/core";
import { getGamesOfDay, prisma } from "@repo/db";

import { DayPicker, dayHref } from "./games/DayPicker";
import { EmptyState } from "./games/EmptyState";
import { formatLongDay } from "./games/format";
import { GameCard } from "./games/GameCard";
import styles from "./page.module.css";

interface GamesOfDayPageProps {
  searchParams: Promise<{ jour?: string | string[] }>;
}

export default async function GamesOfDayPage({ searchParams }: GamesOfDayPageProps) {
  const { jour } = await searchParams;
  const today = getCurrentParisDay();
  const day = typeof jour === "string" && isValidDate(jour) ? jour : today;
  const games = await getGamesOfDay(prisma, day);

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Matchs</h1>
        <p className={styles.date}>{formatLongDay(day)}</p>
      </div>
      <DayPicker selectedDay={day} today={today} />
      {games.length > 0 ? (
        <div className={styles.grid}>
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <EmptyState todayHref={day === today ? undefined : dayHref(today)} />
      )}
    </div>
  );
}
