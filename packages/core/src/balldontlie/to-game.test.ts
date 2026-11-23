import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gamesResponseSchema, type BallDontLieGame } from "./schemas.js";
import { toGame } from "./to-game.js";

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

describe("toGame", () => {
  it("convertit un match terminé", () => {
    expect(toGame(atlDet)).toEqual({
      id: 21718162,
      startsAt: new Date("2026-11-22T20:30:00.000Z"),
      status: "final",
      homeTeam: { id: 1, name: "Atlanta Hawks", abbreviation: "ATL" },
      visitorTeam: { id: 9, name: "Detroit Pistons", abbreviation: "DET" },
      homeScore: 107,
      visitorScore: 97,
    });
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
