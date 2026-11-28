// API publique de @repo/core.
export { fetchGamesByDates } from "./balldontlie/client";
export {
  getAvailableDays,
  getCurrentParisDay,
  getParisDayRange,
  isAvailableDay,
  isValidDate,
  REGULAR_SEASON_END,
  SEASON_START,
  shiftDay,
} from "./games/day";
export type { Conference, Game, GameStatus, Team } from "./games/types";
export { getWinner, type GameSide } from "./games/winner";
export { getCollectDates, getCurrentNewYorkDay, getDatesBetween } from "./games/collect-dates";
export { getStandings, type Standing } from "./games/standings";
