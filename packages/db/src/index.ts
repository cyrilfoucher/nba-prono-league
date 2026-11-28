export { prisma } from "./client";
export type { PrismaClient } from "./generated/prisma/client";
export { getFinalGamesOfSeason, getGamesOfDay, saveGames } from "./games";
