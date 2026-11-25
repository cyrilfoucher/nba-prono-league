import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gamesResponseSchema } from "../balldontlie/schemas";
import { toGame } from "../balldontlie/to-game";
import type { Game } from "./types";
import { getWinner } from "./winner";

const fixture = gamesResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../balldontlie/fixtures/games-2026-11-22.json", import.meta.url), "utf8"),
  ),
);

function gameById(id: number): Game {
  const game = fixture.data.find((g) => g.id === id);
  if (!game) {
    throw new Error(`Match ${String(id)} absent de la fixture`);
  }
  return toGame(game);
}

// ATL 107 - 97 DET : victoire à domicile.
const atlDet = gameById(21718162);
// CHI 145 - 151 DEN : victoire à l'extérieur après prolongation.
const chiDen = gameById(21718166);
// Victoire à domicile d'un seul point (88 - 87).
const onePointGame = gameById(21718170);

describe("getWinner", () => {
  it("renvoie home quand l'équipe à domicile gagne", () => {
    expect(getWinner(atlDet)).toBe("home");
  });

  it("renvoie visitor quand l'équipe à l'extérieur gagne", () => {
    expect(getWinner(chiDen)).toBe("visitor");
  });

  it("départage un match gagné d'un seul point", () => {
    expect(getWinner(onePointGame)).toBe("home");
  });

  it.each(["scheduled", "in_progress", "postponed", "canceled"] as const)(
    "renvoie null si le statut est %s",
    (status) => {
      expect(getWinner({ ...atlDet, status })).toBeNull();
    },
  );

  it("renvoie null si le score à domicile manque", () => {
    expect(getWinner({ ...atlDet, homeScore: null })).toBeNull();
  });

  it("renvoie null si le score à l'extérieur manque", () => {
    expect(getWinner({ ...atlDet, visitorScore: null })).toBeNull();
  });

  it("renvoie null si les deux scores manquent", () => {
    expect(getWinner({ ...atlDet, homeScore: null, visitorScore: null })).toBeNull();
  });

  it("renvoie null en cas d'égalité (donnée erronée)", () => {
    expect(getWinner({ ...atlDet, homeScore: 100, visitorScore: 100 })).toBeNull();
  });

  it("renvoie null en cas d'égalité à 0 - 0", () => {
    expect(getWinner({ ...atlDet, homeScore: 0, visitorScore: 0 })).toBeNull();
  });
});
