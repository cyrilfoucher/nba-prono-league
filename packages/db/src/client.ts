import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

declare global {
  // Ajouter une propriété à globalThis passe obligatoirement par `var`.
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

// En développement, le rechargement à chaud de Next.js réexécute ce fichier :
// on garde le client sur globalThis pour ne pas ouvrir une connexion de plus à chaque fois.
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
