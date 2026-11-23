import type { Game } from "../games/types.js";
import { gamesResponseSchema } from "./schemas.js";
import { toGame } from "./to-game.js";

const GAMES_URL = "https://api.balldontlie.io/v1/games";

export async function fetchGamesByDate(date: string, apiKey: string): Promise<Game[]> {
  const url = new URL(GAMES_URL);
  url.searchParams.append("dates[]", date);
  url.searchParams.set("per_page", "100");
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
  return result.data.data.map(toGame);
}
