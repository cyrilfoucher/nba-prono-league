import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gamesResponseSchema, type BallDontLieGame } from "./schemas";
import { toGame } from "./to-game";

const fixture = gamesResponseSchema.parse(
  JSON.parse(readFileSync(new URL("./fixtures/games-2026-11-22.json", import.meta.url), "utf8")),
);

function gameById(id: number): BallDontLieGame {
  const game = fixture.data.find((g) => g.id === id);
  if (!game) {
    throw new Error(`Match ${String(id)} absent de la fixture`);
  }
  return game;
}

const atlDet = gameById(21718162);
const chiDen = gameById(21718166);
const miaOkc = gameById(21718163);
const utaDal = gameById(21718167);
const gswBos = gameById(21718170);

describe("toGame", () => {
  it("convertit un match terminé", () => {
    expect(toGame(atlDet)).toEqual({
      id: 21718162,
      startsAt: new Date("2026-11-22T20:30:00.000Z"),
      status: "final",
      homeTeam: { id: 1, name: "Atlanta Hawks", abbreviation: "ATL", conference: "East" },
      visitorTeam: { id: 9, name: "Detroit Pistons", abbreviation: "DET", conference: "East" },
      homeScore: 107,
      visitorScore: 97,
    });
  });

  it.each([
    ["MIA-OKC, Est à domicile contre Ouest", miaOkc, "East", "West"],
    ["GSW-BOS, Ouest à domicile contre Est", gswBos, "West", "East"],
    ["UTA-DAL, deux équipes de l'Ouest", utaDal, "West", "West"],
  ] as const)("copie la conférence de chaque équipe (%s)", (_label, apiGame, home, visitor) => {
    const game = toGame(apiGame);

    expect(game.homeTeam.conference).toBe(home);
    expect(game.visitorTeam.conference).toBe(visitor);
  });

  it("copie la conférence telle que l'API la renvoie pour les 14 équipes de la fixture", () => {
    for (const apiGame of fixture.data) {
      const game = toGame(apiGame);

      expect(game.homeTeam.conference).toBe(apiGame.home_team.conference);
      expect(game.visitorTeam.conference).toBe(apiGame.visitor_team.conference);
    }
  });

  it("garde le score final après prolongation", () => {
    const game = toGame(chiDen);

    expect(game.homeScore).toBe(145);
    expect(game.visitorScore).toBe(151);
  });

  it.each(["scheduled", "postponed", "canceled"] as const)(
    "met les scores à null si le statut est %s",
    (status_state) => {
      const game = toGame({ ...atlDet, status_state });

      expect(game.homeScore).toBeNull();
      expect(game.visitorScore).toBeNull();
    },
  );

  it.each(["in_progress", "suspended", "unknown"] as const)(
    "garde les scores si le statut est %s",
    (status_state) => {
      const game = toGame({ ...atlDet, status_state });

      expect(game.homeScore).toBe(107);
      expect(game.visitorScore).toBe(97);
    },
  );

  it.each([
    ["scheduled", "scheduled"],
    ["delayed", "scheduled"],
    ["in_progress", "in_progress"],
    ["suspended", "in_progress"],
    ["unknown", "in_progress"],
    ["final", "final"],
    ["postponed", "postponed"],
    ["canceled", "canceled"],
    ["abandoned", "canceled"],
  ] as const)("convertit le statut %s en %s", (status_state, expected) => {
    expect(toGame({ ...atlDet, status_state }).status).toBe(expected);
  });
});
