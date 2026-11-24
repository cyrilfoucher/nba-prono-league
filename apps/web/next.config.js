import { existsSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Next.js ne lit que les .env de apps/web/ ; or le .env du projet est à la racine
// du monorepo. On le charge ici, s'il existe (il n'y en a pas en CI ni sur Vercel).
const rootEnvFile = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @repo/db exporte directement ses fichiers TypeScript : Next.js doit les compiler.
  transpilePackages: ["@repo/db"],
};

export default nextConfig;
