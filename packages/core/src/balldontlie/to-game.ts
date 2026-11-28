import type { Game, GameStatus, Team } from "../games/types";
import type { BallDontLieGame } from "./schemas";

function toGameStatus(state: BallDontLieGame["status_state"]): GameStatus {
  switch (state) {
    case "scheduled":
    case "delayed":
      return "scheduled";
    case "in_progress":
    case "suspended":
    case "unknown":
      return "in_progress";
    case "final":
      return "final";
    case "postponed":
      return "postponed";
    case "canceled":
    case "abandoned":
      return "canceled";
  }
}

function toTeam(apiTeam: BallDontLieGame["home_team"]): Team {
  return {
    id: apiTeam.id,
    name: apiTeam.full_name,
    abbreviation: apiTeam.abbreviation,
    conference: apiTeam.conference,
  };
}

export function toGame(apiGame: BallDontLieGame): Game {
  const status = toGameStatus(apiGame.status_state);
  const hasStarted = status === "in_progress" || status === "final";
  return {
    id: apiGame.id,
    startsAt: new Date(apiGame.datetime),
    status: status,
    homeTeam: toTeam(apiGame.home_team),
    visitorTeam: toTeam(apiGame.visitor_team),
    homeScore: hasStarted ? apiGame.home_team_score : null,
    visitorScore: hasStarted ? apiGame.visitor_team_score : null,
  };
}
