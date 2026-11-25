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
cp .env.example .env   # puis renseigner la clé BALLDONTLIE et les adresses de la branche Neon development
pnpm dev
```

## Organisation

```
apps/web/                   Appli Next.js
packages/core/              Logique métier (client BALLDONTLIE, points, classements)
packages/db/                Schéma Prisma et accès à la base
packages/eslint-config/     Règles ESLint partagées
packages/typescript-config/ Configuration TypeScript partagée
docs/decisions/             Décisions d'architecture (ADR)
```

## Déploiement

### Vercel

Le projet Vercel a pour Root Directory `apps/web`. La commande de build est définie
dans `apps/web/vercel.json` :

- en **production**, `pnpm db:deploy` (`prisma migrate deploy`) applique les migrations
  avant la construction ; si la migration échoue, le déploiement s'arrête ;
- les déploiements **Preview** construisent sans migrer.

Variables à configurer dans Vercel (Settings → Environment Variables), environnement
Production :

| Variable              | Rôle                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| `BALLDONTLIE_API_KEY` | Clé de l'API BALLDONTLIE                                              |
| `DATABASE_URL`        | Adresse avec pooling (hôte en `-pooler`)                              |
| `DIRECT_URL`          | Adresse directe, sans pooling, utilisée par les migrations            |
| `CRON_SECRET`         | Secret partagé avec cron-job.org pour appeler la route `/api/collect` |

Les adresses Neon sont celles de la branche `production`.

### Neon

La base a deux branches :

- `production` : utilisée par Vercel ;
- `development` : utilisée en local via le `.env` à la racine. C'est là qu'on crée les
  migrations avec `pnpm db:migrate` ; elles sont appliquées en production au
  déploiement suivant.

## Licence

MIT
