import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

// Les variables sont dans le .env à la racine du monorepo. En CI, il n'existe pas :
// `prisma generate` n'a pas besoin de la base, donc on ne plante pas.
const rootEnvFile = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Les migrations passent par l'adresse directe, sans pooling.
    url: process.env.DIRECT_URL,
  },
});
