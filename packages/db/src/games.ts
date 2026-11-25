import { getParisDayRange, type Game, type Team } from "@repo/core";

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
      create: { id: team.id, name: team.name, abbreviation: team.abbreviation },
      update: { name: team.name, abbreviation: team.abbreviation },
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
