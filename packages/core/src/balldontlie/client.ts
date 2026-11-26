import type { Game } from "../games/types";
import { gamesResponseSchema } from "./schemas";
import { toGame } from "./to-game";

const GAMES_URL = "https://api.balldontlie.io/v1/games";

interface GamesPage {
  games: Game[];
  nextCursor: number | undefined;
}

async function fetchGamesPage(
  dates: string[],
  apiKey: string,
  cursor: number | undefined,
): Promise<GamesPage> {
  const url = new URL(GAMES_URL);
  for (const date of dates) {
    url.searchParams.append("dates[]", date);
  }
  url.searchParams.set("per_page", "100");
  if (cursor !== undefined) {
    url.searchParams.set("cursor", String(cursor));
  }
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: apiKey } });
  } catch {
    throw new Error("API BALLDONTLIE injoignable");
  }
  if (response.status === 401) {
    throw new Error("Clé API BALLDONTLIE absente ou invalide");
  }
  if (response.status === 429) {
    throw new Error("Quota BALLDONTLIE dépassé, réessayer plus tard");
  }
  if (!response.ok) {
    throw new Error(`Erreur de l'API BALLDONTLIE (code ${response.status})`);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new Error("Réponse BALLDONTLIE inattendue", { cause: error });
  }
  const result = gamesResponseSchema.safeParse(json);
  if (!result.success) {
    throw new Error("Réponse BALLDONTLIE inattendue", { cause: result.error });
  }
  return { games: result.data.data.map(toGame), nextCursor: result.data.meta.next_cursor };
}

// Récupère les matchs de plusieurs dates en suivant les pages de BALLDONTLIE
// jusqu'à la dernière : peut faire plusieurs requêtes s'il y a plus de 100 matchs.
export async function fetchGamesByDates(dates: string[], apiKey: string): Promise<Game[]> {
  // Sans date, l'API renverrait les matchs de toutes les saisons, page après page.
  if (dates.length === 0) {
    return [];
  }
  const games: Game[] = [];
  let cursor: number | undefined = undefined;
  do {
    const page = await fetchGamesPage(dates, apiKey, cursor);
    games.push(...page.games);
    cursor = page.nextCursor;
  } while (cursor !== undefined);
  return games;
}
