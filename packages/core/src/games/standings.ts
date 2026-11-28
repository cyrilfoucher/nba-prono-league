import type { Conference, Game, Team } from "./types";
import { getWinner } from "./winner";

export interface Standing {
  team: Team;
  wins: number;
  losses: number;
  winPercentage: number;
  // Nombre de matchs de retard sur le premier du classement (de la conférence, ou de la ligue).
  gamesBehind: number;
}

interface TeamRecord {
  team: Team;
  wins: number;
  losses: number;
}

function getRecord(records: Map<number, TeamRecord>, team: Team): TeamRecord {
  let record = records.get(team.id);
  if (record === undefined) {
    record = { team, wins: 0, losses: 0 };
    records.set(team.id, record);
  }
  return record;
}

// Classement d'une conférence, ou de toute la ligue si aucune conférence n'est donnée.
export function getStandings(games: Game[], conference?: Conference): Standing[] {
  const records = new Map<number, TeamRecord>();

  for (const game of games) {
    const winner = getWinner(game);
    // Match pas encore terminé : il ne compte pas dans le classement.
    if (winner === null) {
      continue;
    }
    const home = getRecord(records, game.homeTeam);
    const visitor = getRecord(records, game.visitorTeam);
    if (winner === "home") {
      home.wins++;
      visitor.losses++;
    } else {
      visitor.wins++;
      home.losses++;
    }
  }
  const standings = [...records.values()]
    .filter((record) => conference === undefined || record.team.conference === conference)
    .map((record) => ({
      team: record.team,
      wins: record.wins,
      losses: record.losses,
      winPercentage: record.wins / (record.wins + record.losses),
      gamesBehind: 0,
    }))
    // Meilleur pourcentage d'abord ; à égalité, plus de victoires ; puis ordre alphabétique.
    .sort(
      (a, b) =>
        b.winPercentage - a.winPercentage ||
        b.wins - a.wins ||
        a.team.name.localeCompare(b.team.name),
    );

  const leader = standings[0];
  if (leader === undefined) {
    return [];
  }
  return standings.map((standing) => ({
    ...standing,
    gamesBehind: (leader.wins - standing.wins + (standing.losses - leader.losses)) / 2,
  }));
}
