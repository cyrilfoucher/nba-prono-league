import { readFileSync } from "node:fs";

import { fetchGamesByDate, type Game } from "@repo/core";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { Prisma, PrismaClient } from "./generated/prisma/client";
import { saveGames } from "./games";

const rawFixture = readFileSync(
  new URL("../../core/src/balldontlie/fixtures/games-2026-11-22.json", import.meta.url),
  "utf8",
);

function createFakeDb() {
  const teamUpsert = vi.fn<(args: Prisma.TeamUpsertArgs) => Promise<unknown>>(() =>
    Promise.resolve({}),
  );
  const gameUpsert = vi.fn<(args: Prisma.GameUpsertArgs) => Promise<unknown>>(() =>
    Promise.resolve({}),
  );
  const fake = { team: { upsert: teamUpsert }, game: { upsert: gameUpsert } };
  // saveGames n'utilise que team.upsert et game.upsert : le reste de PrismaClient est inutile ici.
  const db = fake as unknown as PrismaClient;
  return { db, teamUpsert, gameUpsert };
}

function gameById(games: Game[], id: number): Game {
  const game = games.find((g) => g.id === id);
  if (!game) {
    throw new Error(`Match ${String(id)} absent de la fixture`);
  }
  return game;
}

let games: Game[];

describe("saveGames", () => {
  beforeAll(async () => {
    // On passe par la vraie fonction de core, avec un fetch simulé qui renvoie la fixture.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(rawFixture, { status: 200 }))),
    );
    games = await fetchGamesByDate("2026-11-22", "test-api-key");
    vi.unstubAllGlobals();
  });

  it("renvoie le nombre de matchs enregistrés", async () => {
    const { db, gameUpsert } = createFakeDb();

    const saved = await saveGames(db, games);

    expect(saved).toBe(7);
    expect(gameUpsert).toHaveBeenCalledTimes(7);
  });

  it("upserte chaque équipe une seule fois", async () => {
    const { db, teamUpsert } = createFakeDb();

    await saveGames(db, games);

    const teamIds = teamUpsert.mock.calls.map(([args]) => args.where.id);
    expect(teamIds).toHaveLength(14);
    expect(new Set(teamIds).size).toBe(14);
  });

  it("n'upserte pas deux fois une équipe présente dans plusieurs matchs de la liste", async () => {
    const { db, teamUpsert, gameUpsert } = createFakeDb();
    const atlDet = gameById(games, 21718162);
    const miaOkc = gameById(games, 21718163);

    await saveGames(db, [atlDet, miaOkc, atlDet]);

    const teamIds = teamUpsert.mock.calls.map(([args]) => args.where.id);
    expect(teamIds).toEqual([1, 9, 16, 21]);
    expect(gameUpsert).toHaveBeenCalledTimes(3);
  });

  it("upserte toutes les équipes avant le premier match", async () => {
    const { db, teamUpsert, gameUpsert } = createFakeDb();

    await saveGames(db, games);

    const lastTeamCall = Math.max(...teamUpsert.mock.invocationCallOrder);
    const firstGameCall = Math.min(...gameUpsert.mock.invocationCallOrder);
    expect(lastTeamCall).toBeLessThan(firstGameCall);
  });

  it("passe les bons arguments pour une équipe", async () => {
    const { db, teamUpsert } = createFakeDb();

    await saveGames(db, [gameById(games, 21718162)]);

    expect(teamUpsert).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      create: { id: 1, name: "Atlanta Hawks", abbreviation: "ATL" },
      update: { name: "Atlanta Hawks", abbreviation: "ATL" },
    });
  });

  it("passe les bons arguments create et update pour un match", async () => {
    const { db, gameUpsert } = createFakeDb();

    await saveGames(db, [gameById(games, 21718162)]);

    expect(gameUpsert).toHaveBeenCalledWith({
      where: { id: 21718162 },
      create: {
        id: 21718162,
        startsAt: new Date("2026-11-22T20:30:00.000Z"),
        status: "final",
        homeTeamId: 1,
        visitorTeamId: 9,
        homeScore: 107,
        visitorScore: 97,
      },
      update: {
        startsAt: new Date("2026-11-22T20:30:00.000Z"),
        status: "final",
        homeScore: 107,
        visitorScore: 97,
      },
    });
  });

  it("renvoie 0 et n'appelle pas la base pour une liste vide", async () => {
    const { db, teamUpsert, gameUpsert } = createFakeDb();

    const saved = await saveGames(db, []);

    expect(saved).toBe(0);
    expect(teamUpsert).not.toHaveBeenCalled();
    expect(gameUpsert).not.toHaveBeenCalled();
  });

  it("propage l'erreur si la base échoue", async () => {
    const { db, teamUpsert, gameUpsert } = createFakeDb();
    teamUpsert.mockRejectedValueOnce(new Error("connexion perdue"));

    await expect(saveGames(db, games)).rejects.toThrow("connexion perdue");
    expect(gameUpsert).not.toHaveBeenCalled();
  });
});
