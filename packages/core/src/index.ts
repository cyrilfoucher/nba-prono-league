// API publique de @repo/core.
export { fetchGamesByDate } from "./balldontlie/client";
export { getCurrentParisDay, getParisDayRange, isValidDate, shiftDay } from "./games/day";
export type { Game, GameStatus, Team } from "./games/types";
export { getWinner, type GameSide } from "./games/winner";
