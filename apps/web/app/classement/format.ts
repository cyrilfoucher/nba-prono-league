// Pourcentage à l'américaine : 0.6667 devient ".667", 1 devient "1.000".
export function formatWinPercentage(winPercentage: number): string {
  return winPercentage.toFixed(3).replace(/^0/, "");
}

// Convention NBA : « – » pour le premier ; virgule française pour les demi-matchs ;
// vrai signe moins (−) pour un écart négatif en début de saison.
export function formatGamesBehind(gamesBehind: number): string {
  if (gamesBehind === 0) {
    return "–";
  }
  const value = String(Math.abs(gamesBehind)).replace(".", ",");
  return gamesBehind < 0 ? `−${value}` : value;
}

// Nom court d'une équipe pour les petits écrans : le dernier mot (« Atlanta Hawks » → « Hawks »).
export function shortTeamName(name: string): string {
  return name.split(" ").at(-1) ?? name;
}
