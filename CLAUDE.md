# NBA Prono League

Pronostics NBA entre amis : chacun pronostique les matchs de la nuit, gagne des points
et se compare aux autres dans des ligues privées. Données réelles de l'API BALLDONTLIE.

## Qui travaille sur ce projet, et comment

Ce projet est le portfolio de Cyril, développeur en reconversion. **Le but est qu'il
comprenne entièrement le code.** La répartition est stricte :

- **Cyril écrit la logique métier** : client BALLDONTLIE, calcul des points,
  verrouillage des pronostics, classements, statistiques, accès aux données. Elle vit
  dans `packages/core`.
- **Les agents font le reste** : composants et pages, design, configuration, tests,
  relecture.
- **Cyril relit tout** avant chaque commit.

Règles qui en découlent :

- N'écris **jamais** de logique métier dans `packages/core`. Si une tâche en demande,
  arrête-toi et explique à Cyril ce qu'il doit écrire, étape par étape, sans lui donner
  le code complet.
- Quand tu écris du code, explique-le en français simple : à quoi il sert et comment
  il marche.
- **Ne commite pas et ne pousse pas.** C'est Cyril qui le fait, après vérification.
- **N'ajoute pas de dépendance** sans l'avoir proposée et obtenu son accord.
- Fais une seule chose à la fois et termine-la avant de passer à autre chose.

## Périmètre

- **V1** : site web responsive. Comptes, ligues privées avec code d'invitation,
  pronostics, verrouillage au coup d'envoi, récupération automatique des résultats,
  points, classements, statistiques personnelles, compte de démo.
- **V2** : application mobile Expo, notifications push, scores en temps réel.
- **V3** : assistant IA.

On ne code que la version en cours. Pas de fonctionnalité « au cas où ».

## Règles du jeu

- Pour chaque match, un joueur choisit le **vainqueur** et un **écart** parmi trois
  tranches : 1 à 5 points, 6 à 10 points, 11 points et plus.
- Barème : bon vainqueur = **1 point**. Bon vainqueur et bon écart = **1 + 2 points
  de bonus**. Mauvais vainqueur = 0 point, même si l'écart est juste.
- **Un seul pronostic par match et par joueur.** Il compte dans toutes ses ligues.
- Un pronostic est modifiable jusqu'au coup d'envoi, puis **verrouillé**.
- Les pronostics des autres membres d'une ligue ne sont visibles qu'après le coup
  d'envoi du match.
- Les horaires sont affichés à l'heure française (`Europe/Paris`) ; les dates sont
  stockées en UTC.
- Le créateur d'une ligue peut la renommer, retirer un membre et régénérer le code
  d'invitation.

## Écrans de la V1

1. Accueil public : présentation, inscription, connexion, bouton « Essayer la démo ».
2. Inscription et connexion : email, mot de passe, pseudo.
3. Matchs : matchs par jour (hier, aujourd'hui, demain), saisie du pronostic,
   verrouillage, score final et points obtenus.
4. Mes ligues : liste, création (code d'invitation généré), adhésion par code.
5. Page d'une ligue : classement, pronostics des membres après le coup d'envoi,
   gestion par le créateur.
6. Mon profil : historique des pronostics et statistiques personnelles.

## Stack

| Domaine          | Choix                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Monorepo         | pnpm workspaces + Turborepo                                                                           |
| Web              | Next.js 16 (App Router), React 19                                                                     |
| Langage          | TypeScript strict. TypeScript 7 pour `tsc`, TypeScript 6 pour les outils (voir `docs/decisions/0001`) |
| Base de données  | PostgreSQL (Neon) + Prisma — à mettre en place                                                        |
| Authentification | Compatible web et mobile (Expo) — bibliothèque à choisir, ADR à écrire                                |
| Tests            | Vitest                                                                                                |
| Données          | API BALLDONTLIE (plan gratuit)                                                                        |
| Déploiement      | Vercel ; collecte déclenchée par cron-job.org sur une route API protégée                              |
| Mobile (V2)      | Expo                                                                                                  |

Les décisions importantes sont dans `docs/decisions/` (ADR). Une nouvelle décision
d'architecture = un nouvel ADR numéroté. On ne modifie jamais un ADR accepté.

## Organisation

```
apps/web/                   Appli Next.js : pages, API, collecte
apps/mobile/                (V2) Appli Expo
packages/core/              Logique métier de Cyril
packages/db/                Schéma Prisma et accès à la base — à créer
packages/eslint-config/     Règles ESLint partagées
packages/typescript-config/ Configuration TypeScript partagée
docs/decisions/             ADR
```

Le code est **organisé par fonctionnalité**, pas par type de fichier : tout ce qui
concerne une fonctionnalité (fonctions, types, tests) est rangé ensemble, par exemple
`packages/core/src/balldontlie/` ou `packages/core/src/scoring/`.

## Commandes

```bash
pnpm install        # installer les dépendances
pnpm dev            # lancer l'appli en local
pnpm format         # formater tout le projet
pnpm format:check   # vérifier le formatage (CI)
pnpm lint           # ESLint avec lint typé
pnpm check-types    # vérifier les types (tsc, TypeScript 7)
pnpm test           # lancer les tests (Vitest)
pnpm build          # compiler
```

Avant de dire qu'une tâche est finie : `pnpm format`, `pnpm lint`, `pnpm check-types`,
`pnpm test` et `pnpm build` doivent passer.

## Conventions

- **Langue** : noms dans le code en anglais ; commentaires, commits, tickets, pull
  requests et documentation en français.
- **Commits** : Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`,
  `ci:`), vérifiés par commitlint.
- **Branches** : `feat/…`, `fix/…`, `chore/…`. Jamais de travail direct sur `main`.
- **Processus** : ticket → branche → commits → pull request → CI verte → relecture →
  fusion en squash.
- **TypeScript** : pas de `any`, pas de `as` pour forcer un type sans raison. Toute
  promesse est attendue ou gérée.
- **Commentaires** : rares et courts, uniquement pour expliquer un pourquoi qui n'est
  pas évident. Les explications destinées à Cyril vont dans la conversation, jamais
  dans les fichiers.

## Données

- Uniquement des **données réelles** de BALLDONTLIE : calendrier, équipes, scores.
  Pas de matchs ni de résultats inventés.
- Pour les tests et le développement hors ligne : des fixtures, c'est-à-dire de vraies
  réponses de BALLDONTLIE enregistrées dans des fichiers.
- Plan gratuit BALLDONTLIE : **5 requêtes par minute**. Ne lance jamais d'appels en
  boucle. La clé se transmet dans l'en-tête `Authorization`.
- Collecte : le calendrier une fois par jour, les scores toutes les 10 à 15 minutes
  pendant les matchs.
- Compte de démo : un script crée des comptes de démo qui pronostiquent au hasard les
  vrais matchs. Aucune donnée saisie à la main.

## Sécurité

- Ne lis jamais et n'écris jamais dans les fichiers `.env`. Les variables attendues
  sont décrites dans `.env.example`.
- Aucun secret dans le code ni dans les commits.

## Agents du projet

Les agents spécialisés sont dans `.claude/agents/` : `code-reviewer`, `test-writer`,
`ui-builder`, `devops`. Chacun a un rôle et des droits limités : respecte-les.
