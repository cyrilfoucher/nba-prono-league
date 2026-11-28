export type GameStatus = "scheduled" | "in_progress" | "final" | "postponed" | "canceled";

export type Conference = "East" | "West";

export interface Team {
  id: number;
  name: string;
  abbreviation: string;
  conference: Conference;
}

export interface Game {
  id: number;
  startsAt: Date;
  status: GameStatus;
  homeTeam: Team;
  visitorTeam: Team;
  homeScore: number | null;
  visitorScore: number | null;
}
