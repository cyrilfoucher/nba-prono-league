import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    languageOptions: {
      parserOptions: {
        // Sans ce réglage, typescript-eslint chercherait le tsconfig depuis le dossier
        // où la commande est lancée : on lui indique celui du paquet db.
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Code produit par `prisma generate` : on ne le lint pas.
    ignores: ["src/generated/**"],
  },
];
