# NBA Prono League

Pronostics NBA entre amis. Chaque joueur pronostique le vainqueur et l'écart des matchs
de la nuit, marque des points et se compare aux autres dans des ligues privées. Les
matchs et les résultats sont réels (API BALLDONTLIE).

> Projet en cours de développement.

## Fonctionnalités prévues

- **V1 — site web** : comptes, ligues privées avec code d'invitation, pronostics
  verrouillés au coup d'envoi, résultats récupérés automatiquement, points,
  classements, statistiques personnelles, compte de démo.
- **V2 — mobile** : application Expo, notifications push, scores en temps réel.
- **V3 — IA** : assistant intégré.

## Stack

Monorepo pnpm + Turborepo · Next.js 16 · React 19 · TypeScript · PostgreSQL (Neon) +
Prisma · Vitest · Vercel · Expo (V2)

## Lancer le projet

```bash
pnpm install
cp .env.example .env   # puis renseigner la clé BALLDONTLIE
pnpm dev
```

## Organisation

```
apps/web/                   Appli Next.js
packages/core/              Logique métier (client BALLDONTLIE, points, classements)
packages/eslint-config/     Règles ESLint partagées
packages/typescript-config/ Configuration TypeScript partagée
docs/decisions/             Décisions d'architecture (ADR)
```

## Licence

MIT
