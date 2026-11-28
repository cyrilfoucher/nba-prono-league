import { readFileSync } from "node:fs";

import { fetchGamesByDates, type Game } from "@repo/core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Prisma, PrismaClient } from "./generated/prisma/client";
import { getFinalGamesOfSeason, getGamesOfDay, saveGames } from "./games";

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

function createFakeReadDb(rows: Game[]) {
  const gameFindMany = vi.fn<(args: Prisma.GameFindManyArgs) => Promise<Game[]>>(() =>
    Promise.resolve(rows),
  );
  // getGamesOfDay n'utilise que game.findMany : le reste de PrismaClient est inutile ici.
  const db = { game: { findMany: gameFindMany } } as unknown as PrismaClient;
  return { db, gameFindMany };
}

let games: Game[];

beforeAll(async () => {
  // On passe par la vraie fonction de core, avec un fetch simulé qui renvoie la fixture.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(rawFixture, { status: 200 }))),
  );
  games = await fetchGamesByDates(["2026-11-22"], "test-api-key");
  vi.unstubAllGlobals();
});

describe("saveGames", () => {
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
      create: { id: 1, name: "Atlanta Hawks", abbreviation: "ATL", conference: "East" },
      update: { name: "Atlanta Hawks", abbreviation: "ATL", conference: "East" },
    });
  });

  it("envoie la conférence de chaque équipe dans create et dans update", async () => {
    const { db, teamUpsert } = createFakeDb();

    // MIA (Est) reçoit OKC (Ouest) dans la fixture.
    await saveGames(db, [gameById(games, 21718163)]);

    expect(teamUpsert).toHaveBeenCalledTimes(2);
    expect(teamUpsert).toHaveBeenNthCalledWith(1, {
      where: { id: 16 },
      create: { id: 16, name: "Miami Heat", abbreviation: "MIA", conference: "East" },
      update: { name: "Miami Heat", abbreviation: "MIA", conference: "East" },
    });
    expect(teamUpsert).toHaveBeenNthCalledWith(2, {
      where: { id: 21 },
      create: { id: 21, name: "Oklahoma City Thunder", abbreviation: "OKC", conference: "West" },
      update: { name: "Oklahoma City Thunder", abbreviation: "OKC", conference: "West" },
    });
  });

  it("envoie toujours une conférence, la même dans create et update, pour les 14 équipes", async () => {
    const { db, teamUpsert } = createFakeDb();

    await saveGames(db, games);

    const byId = new Map(games.flatMap((g) => [g.homeTeam, g.visitorTeam]).map((t) => [t.id, t]));
    expect(teamUpsert).toHaveBeenCalledTimes(14);
    for (const [args] of teamUpsert.mock.calls) {
      const expected = byId.get(args.where.id ?? -1)?.conference;
      expect(expected).toBeDefined();
      expect(args.create.conference).toBe(expected);
      expect(args.update.conference).toBe(expected);
    }
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

describe("getGamesOfDay", () => {
  it.each([
    {
      label: "un jour d'hiver (UTC+1)",
      date: "2026-11-26",
      gte: "2026-11-25T23:00:00.000Z",
      lt: "2026-11-26T23:00:00.000Z",
    },
    {
      label: "un jour d'été (UTC+2)",
      date: "2026-07-15",
      gte: "2026-07-14T22:00:00.000Z",
      lt: "2026-07-15T22:00:00.000Z",
    },
    {
      label: "le passage à l'heure d'été (journée de 23 h)",
      date: "2026-03-29",
      gte: "2026-03-28T23:00:00.000Z",
      lt: "2026-03-29T22:00:00.000Z",
    },
    {
      label: "le passage à l'heure d'hiver (journée de 25 h)",
      date: "2026-10-25",
      gte: "2026-10-24T22:00:00.000Z",
      lt: "2026-10-25T23:00:00.000Z",
    },
  ])("filtre sur le jour de Paris pour $label", async ({ date, gte, lt }) => {
    const { db, gameFindMany } = createFakeReadDb([]);

    await getGamesOfDay(db, date);

    expect(gameFindMany).toHaveBeenCalledTimes(1);
    const [args] = gameFindMany.mock.calls[0] ?? [];
    expect(args?.where).toEqual({ startsAt: { gte: new Date(gte), lt: new Date(lt) } });
  });

  it("inclut les deux équipes et trie par heure de début croissante", async () => {
    const { db, gameFindMany } = createFakeReadDb([]);

    await getGamesOfDay(db, "2026-11-22");

    expect(gameFindMany).toHaveBeenCalledWith({
      where: {
        startsAt: {
          gte: new Date("2026-11-21T23:00:00.000Z"),
          lt: new Date("2026-11-22T23:00:00.000Z"),
        },
      },
      include: { homeTeam: true, visitorTeam: true },
      orderBy: { startsAt: "asc" },
    });
  });

  it("renvoie tels quels les matchs renvoyés par la base", async () => {
    const { db } = createFakeReadDb(games);

    const result = await getGamesOfDay(db, "2026-11-22");

    expect(result).toBe(games);
  });

  it("renvoie un tableau vide quand la base ne trouve aucun match", async () => {
    const { db } = createFakeReadDb([]);

    const result = await getGamesOfDay(db, "2026-11-26");

    expect(result).toEqual([]);
  });

  it("propage l'erreur si la base échoue", async () => {
    const { db, gameFindMany } = createFakeReadDb([]);
    gameFindMany.mockRejectedValueOnce(new Error("connexion perdue"));

    await expect(getGamesOfDay(db, "2026-11-22")).rejects.toThrow("connexion perdue");
  });
});

describe("getFinalGamesOfSeason", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Seule l'horloge (Date) est simulée : les promesses de findMany se résolvent normalement.
  function setNow(iso: string) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(iso));
  }

  it("demande les matchs terminés de la saison régulière, de minuit (Paris) au début du play-in", async () => {
    setNow("2026-11-28T12:00:00.000Z");
    const { db, gameFindMany } = createFakeReadDb([]);

    await getFinalGamesOfSeason(db);

    // Premier jour : 2026-10-20, encore à l'heure d'été (UTC+2) → minuit à Paris = 22:00 UTC la veille.
    // Dernier jour : 2027-04-11 à New York ; on garde le 12 à Paris → fin à minuit le 13 (22:00 UTC le 12).
    expect(gameFindMany).toHaveBeenCalledTimes(1);
    expect(gameFindMany).toHaveBeenCalledWith({
      where: {
        startsAt: {
          gte: new Date("2026-10-19T22:00:00.000Z"),
          lt: new Date("2027-04-12T22:00:00.000Z"),
        },
        status: "final",
      },
      include: { homeTeam: true, visitorTeam: true },
      orderBy: { startsAt: "asc" },
    });
  });

  it.each([
    { label: "le soir du 1er jour de la saison, heure de Paris", now: "2026-10-20T21:59:59.000Z" },
    { label: "un soir où Paris est déjà le lendemain", now: "2026-12-31T23:30:00.000Z" },
    { label: "en fin de saison régulière", now: "2027-04-11T18:00:00.000Z" },
  ])("garde les mêmes bornes de saison $label", async ({ now }) => {
    setNow(now);
    const { db, gameFindMany } = createFakeReadDb([]);

    await getFinalGamesOfSeason(db);

    const [args] = gameFindMany.mock.calls[0] ?? [];
    expect(args?.where).toEqual({
      startsAt: {
        gte: new Date("2026-10-19T22:00:00.000Z"),
        lt: new Date("2027-04-12T22:00:00.000Z"),
      },
      status: "final",
    });
  });

  it("renvoie tels quels les matchs renvoyés par la base", async () => {
    setNow("2026-11-28T12:00:00.000Z");
    const { db } = createFakeReadDb(games);

    const result = await getFinalGamesOfSeason(db);

    expect(result).toBe(games);
  });

  it("renvoie un tableau vide quand aucun match n'est terminé", async () => {
    setNow("2026-10-20T08:00:00.000Z");
    const { db } = createFakeReadDb([]);

    await expect(getFinalGamesOfSeason(db)).resolves.toEqual([]);
  });

  it("propage l'erreur si la base échoue", async () => {
    setNow("2026-11-28T12:00:00.000Z");
    const { db, gameFindMany } = createFakeReadDb([]);
    gameFindMany.mockRejectedValueOnce(new Error("connexion perdue"));

    await expect(getFinalGamesOfSeason(db)).rejects.toThrow("connexion perdue");
  });
});
