import { getStandings } from "@repo/core";
import { getFinalGamesOfSeason, prisma } from "@repo/db";
import Link from "next/link";
import { connection } from "next/server";

import { classNames } from "../components/class-names";
import styles from "./page.module.css";
import { StandingsTable } from "./StandingsTable";

interface StandingsPageProps {
  searchParams: Promise<{ vue?: string | string[] }>;
}

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  // Rend la page à chaque requête : sans cela, le build interrogerait la base.
  await connection();
  const { vue } = await searchParams;
  const isLeague = vue === "ligue";
  const games = await getFinalGamesOfSeason(prisma);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Classement NBA</h1>
      <nav className={styles.tabs} aria-label="Type de classement">
        <Link
          href="/classement"
          className={classNames(styles.tab, !isLeague && styles.tabActive)}
          aria-current={isLeague ? undefined : "page"}
        >
          Conférences
        </Link>
        <Link
          href="/classement?vue=ligue"
          className={classNames(styles.tab, isLeague && styles.tabActive)}
          aria-current={isLeague ? "page" : undefined}
        >
          Ligue
        </Link>
      </nav>
      {isLeague ? (
        <StandingsTable
          id="ligue"
          title="Toute la ligue"
          color="var(--color-accent)"
          standings={getStandings(games)}
          showZones={false}
        />
      ) : (
        <div className={styles.grid}>
          <StandingsTable
            id="est"
            title="Conférence Est"
            color="var(--color-east)"
            standings={getStandings(games, "East")}
          />
          <StandingsTable
            id="ouest"
            title="Conférence Ouest"
            color="var(--color-west)"
            standings={getStandings(games, "West")}
          />
        </div>
      )}
    </div>
  );
}
