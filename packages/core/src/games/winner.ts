import type { Game } from "./types";

// Côté d'un match : l'équipe à domicile ou l'équipe à l'extérieur.
export type GameSide = "home" | "visitor";

// Renvoie le côté vainqueur d'un match terminé.
// Renvoie null tant que le match n'est pas terminé ou si un score manque.
// Il n'y a pas de match nul en NBA (prolongations jusqu'à départager les équipes) :
// une égalité ne peut venir que d'une donnée erronée, on renvoie alors null par sécurité.
export function getWinner(
  game: Pick<Game, "status" | "homeScore" | "visitorScore">,
): GameSide | null {
  if (game.status !== "final") {
    return null;
  }
  if (game.homeScore === null || game.visitorScore === null) {
    return null;
  }
  if (game.homeScore === game.visitorScore) {
    return null;
  }
  return game.homeScore > game.visitorScore ? "home" : "visitor";
}
