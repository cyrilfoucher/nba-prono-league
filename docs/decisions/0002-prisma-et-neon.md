# 0002 — PostgreSQL chez Neon, avec Prisma 7

- Date : 2026-11-24
- Statut : Acceptée

## Contexte

Le projet a besoin d'une base de données pour les comptes, les ligues, les
pronostics et les matchs récupérés depuis BALLDONTLIE. La stack prévoit
PostgreSQL. Il reste à choisir l'hébergeur et l'outil qui fait le lien entre
le code TypeScript et la base.

Contraintes :

- l'appli est déployée sur Vercel, en fonctions serverless : chaque fonction
  peut ouvrir sa propre connexion, il faut donc un pool de connexions côté
  base ;
- le projet est un portfolio : une offre gratuite suffisante est nécessaire ;
- Cyril doit comprendre et faire évoluer le schéma lui-même : il doit être
  lisible, versionné, et les types TypeScript doivent en découler.

Options étudiées pour l'hébergement :

1. Neon : PostgreSQL serverless, offre gratuite, branches de base (une copie
   de la base pour tester une migration), pooling de connexions intégré.
2. Supabase : PostgreSQL avec beaucoup de services autour (authentification,
   stockage) dont le projet n'a pas besoin pour l'instant.
3. Vercel Postgres : n'est plus proposé directement par Vercel, qui renvoie
   vers des fournisseurs comme Neon.

Options étudiées pour l'accès à la base :

1. Prisma 7 : schéma déclaratif dans un fichier `.prisma`, migrations
   générées, client typé généré à partir du schéma.
2. Drizzle : schéma écrit en TypeScript, plus léger, plus proche du SQL, mais
   moins guidé pour un développeur qui débute avec les bases de données.

Options étudiées pour la connexion de Prisma à Neon :

1. `@prisma/adapter-pg` : utilise le pilote PostgreSQL standard `pg`, avec
   l'adresse « pooling » de Neon.
2. `@prisma/adapter-neon` : pilote propre à Neon, utile surtout pour les
   environnements edge, que le projet n'utilise pas.

## Décision

- La base est un PostgreSQL hébergé chez **Neon**.
- L'accès à la base passe par **Prisma 7**, dans le paquet `packages/db`.
- Prisma se connecte avec **`@prisma/adapter-pg`**.
- Deux adresses de connexion sont utilisées :
  - `DATABASE_URL`, l'adresse avec pooling (hôte contenant `-pooler`), pour
    l'appli ;
  - `DIRECT_URL`, l'adresse directe, pour la CLI Prisma et les migrations,
    qui ne fonctionnent pas à travers le pooling.
- La configuration de la CLI est dans `packages/db/prisma.config.ts`, qui lit
  le `.env` à la racine du monorepo s'il existe.

## Conséquences

- `prisma generate` doit tourner avant le lint, la vérification des types, les
  tests, le build et le serveur de développement : Turborepo lance la tâche
  `db:generate` avant `lint`, `check-types`, `test`, `build` et `dev`.
- Le client généré (`packages/db/src/generated/`) n'est pas commité : il est
  recréé par cette tâche `db:generate`, en CI comme en local. Il n'y a pas de
  script `postinstall` : `pnpm install` seul ne le génère pas.
- Next.js ne lit que les fichiers `.env` de `apps/web/`. L'appli web charge donc
  le `.env` de la racine du monorepo dans `apps/web/next.config.js`, s'il existe.
- La CI n'a pas de base de données : `prisma generate` ne s'y connecte pas, et
  aucune commande de la CI ne touche la base.
- Les scripts d'installation de `prisma` et `@prisma/engines` sont autorisés
  dans `pnpm-workspace.yaml`.
