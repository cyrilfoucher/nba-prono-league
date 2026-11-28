import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { gamesResponseSchema } from "./schemas";

const rawFixture = readFileSync(
  new URL("./fixtures/games-2026-11-22.json", import.meta.url),
  "utf8",
);

const rawTeamSchema = z.record(z.string(), z.unknown());
const rawResponseSchema = z.looseObject({
  data: z.array(z.looseObject({ home_team: rawTeamSchema, visitor_team: rawTeamSchema })),
});

// Copie neuve de la vraie réponse, dont on modifie ensuite une seule équipe.
function freshResponse() {
  return rawResponseSchema.parse(JSON.parse(rawFixture));
}

function firstHomeTeam(response: ReturnType<typeof freshResponse>) {
  const team = response.data[0]?.home_team;
  if (!team) {
    throw new Error("La fixture doit contenir au moins un match");
  }
  return team;
}

describe("gamesResponseSchema, conférence des équipes", () => {
  it("accepte la vraie réponse BALLDONTLIE et garde la conférence", () => {
    const parsed = gamesResponseSchema.parse(JSON.parse(rawFixture));

    expect(parsed.data[0]?.home_team.conference).toBe("East");
    const conferences = parsed.data.flatMap((g) => [
      g.home_team.conference,
      g.visitor_team.conference,
    ]);
    expect(new Set(conferences)).toEqual(new Set(["East", "West"]));
  });

  it("refuse une équipe sans conférence", () => {
    const response = freshResponse();
    delete firstHomeTeam(response).conference;

    expect(gamesResponseSchema.safeParse(response).success).toBe(false);
  });

  it.each([null, "", "Central", "east", "EAST", 1])("refuse la conférence %j", (conference) => {
    const response = freshResponse();
    firstHomeTeam(response).conference = conference;

    expect(gamesResponseSchema.safeParse(response).success).toBe(false);
  });
});
