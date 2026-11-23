import { z } from "zod";

const teamSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  abbreviation: z.string(),
});

const gameSchema = z.object({
  id: z.number(),
  datetime: z.iso.datetime(),
  status_state: z.enum([
    "scheduled",
    "in_progress",
    "final",
    "postponed",
    "canceled",
    "delayed",
    "suspended",
    "abandoned",
    "unknown",
  ]),
  home_team_score: z.number().nullable(),
  visitor_team_score: z.number().nullable(),
  home_team: teamSchema,
  visitor_team: teamSchema,
});

export const gamesResponseSchema = z.object({
  data: z.array(gameSchema),
});

export type BallDontLieGame = z.infer<typeof gameSchema>;
