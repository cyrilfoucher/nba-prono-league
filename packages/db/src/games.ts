import {
  getParisDayRange,
  REGULAR_SEASON_END,
  SEASON_START,
  shiftDay,
  type Game,
  type Team,
} from "@repo/core";

import type { PrismaClient } from "./generated/prisma/client";

export async function saveGames(db: PrismaClient, games: Game[]): Promise<number> {
  const teams = new Map<number, Team>();
  for (const game of games) {
    teams.set(game.homeTeam.id, game.homeTeam);
    teams.set(game.visitorTeam.id, game.visitorTeam);
  }

  for (const team of teams.values()) {
    await db.team.upsert({
      where: { id: team.id },
      create: {
        id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        conference: team.conference,
      },
      update: { name: team.name, abbreviation: team.abbreviation, conference: team.conference },
    });
  }

  for (const game of games) {
    await db.game.upsert({
      where: { id: game.id },
      create: {
        id: game.id,
        startsAt: game.startsAt,
        status: game.status,
        homeTeamId: game.homeTeam.id,
        visitorTeamId: game.visitorTeam.id,
        homeScore: game.homeScore,
        visitorScore: game.visitorScore,
      },
      update: {
        startsAt: game.startsAt,
        status: game.status,
        homeScore: game.homeScore,
        visitorScore: game.visitorScore,
      },
    });
  }

  return games.length;
}

export async function getGamesOfDay(db: PrismaClient, date: string): Promise<Game[]> {
  const { start, end } = getParisDayRange(date);
  return db.game.findMany({
    where: { startsAt: { gte: start, lt: end } },
    include: { homeTeam: true, visitorTeam: true },
    orderBy: { startsAt: "asc" },
  });
}

// Récupère les matchs terminés de la saison régulière en cours, avec leurs équipes.
// Le play-in et les playoffs, qui commencent après la saison régulière, ne comptent pas.
export async function getFinalGamesOfSeason(db: PrismaClient): Promise<Game[]> {
  const { start } = getParisDayRange(SEASON_START);
  // Les matchs du soir du dernier jour (heure de New York) tombent le lendemain à Paris.
  const { end } = getParisDayRange(shiftDay(REGULAR_SEASON_END, 1));
  return db.game.findMany({
    where: { startsAt: { gte: start, lt: end }, status: "final" },
    include: { homeTeam: true, visitorTeam: true },
    orderBy: { startsAt: "asc" },
  });
}
