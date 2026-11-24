# 0003 — Résolution de modules « Bundler » pour packages/core et packages/db

- Date : 2026-11-24
- Statut : Acceptée

## Contexte

`packages/core` et `packages/db` n'ont pas d'étape de compilation : ils exportent
directement leurs fichiers TypeScript (`"exports": { ".": "./src/index.ts" }`), et
l'appli web les fait compiler par Next.js grâce à `transpilePackages`.

Ces deux paquets héritaient de `packages/typescript-config/base.json`, réglé en
`"module": "NodeNext"` et `"moduleResolution": "NodeNext"`. Ce mode impose
d'écrire les imports relatifs avec l'extension `.js`, même quand le fichier
importé est un `.ts` (`import { toGame } from "./to-game.js"`). `tsc` sait faire
le lien entre `./to-game.js` et `to-game.ts`. Le client Prisma généré suivait la
même règle.

Turbopack, le compilateur utilisé par `next build` dans Next.js 16, ne fait pas
ce lien : il cherche un vrai fichier `to-game.js`, qui n'existe pas. Le problème
est resté invisible tant que l'appli web n'importait ni core ni db. Il est apparu
avec la route `/api/collect`, la première à les importer : `pnpm build` échouait
avec `Module not found: Can't resolve './balldontlie/client.js'`.

Next.js propose bien l'option `experimental.extensionAlias`, qui traduit `.js` en
`.ts`, mais elle ne s'applique qu'à webpack, pas à Turbopack.

Options étudiées :

1. Passer core et db en résolution « Bundler » et écrire les imports relatifs
   sans extension (`./to-game`).
2. Compiler l'appli avec webpack (`next build --webpack`) et ajouter
   `experimental.extensionAlias: { ".js": [".ts", ".js"] }`.
3. Écrire les imports avec l'extension `.ts` et activer
   `allowImportingTsExtensions`.
4. Ajouter une étape de build à core et db, pour qu'ils exportent du JavaScript
   compilé dans un dossier `dist/`.

## Décision

Option 1.

- Une nouvelle configuration partagée, `packages/typescript-config/library.json`,
  étend `base.json` avec `"module": "ESNext"` et `"moduleResolution": "Bundler"`.
- `packages/core/tsconfig.json` et `packages/db/tsconfig.json` héritent de
  `library.json` au lieu de `base.json`. `base.json` ne change pas.
- Dans `packages/core/src` et `packages/db/src`, les imports relatifs s'écrivent
  sans extension (`./client` et non `./client.js`).
- Le générateur Prisma de `packages/db/prisma/schema.prisma` utilise l'option
  `importFileExtension = ""` : le client généré importe lui aussi ses fichiers
  sans extension.

Alternatives écartées :

- **webpack avec `extensionAlias`** : on renoncerait à Turbopack, le compilateur
  par défaut de Next.js 16, plus rapide. On s'appuierait aussi sur une option
  expérimentale.
- **Imports en `.ts` avec `allowImportingTsExtensions`** : cette option n'est
  permise que si TypeScript ne produit pas de JavaScript (`noEmit` ou
  `emitDeclarationOnly`), et cette écriture est peu courante dans les
  monorepos Next.js.
- **Étape de build pour core et db** : un `dist/` à produire, à ignorer, à
  ordonner dans Turborepo et à surveiller en mode développement. C'est beaucoup
  de complexité pour un projet de cette taille.

## Conséquences

- `pnpm build` fonctionne avec Turbopack quand l'appli web importe core et db.
- Écrire `./fichier` sans extension est la forme habituelle dans un monorepo
  Next.js et Turborepo.
- Core et db ne peuvent plus être exécutés directement par Node.js : Node exige
  l'extension dans les imports relatifs. Ils doivent passer par un outil qui
  résout les imports comme un bundler : Next.js, Vitest, ou `tsx` pour un script.
  Il faudra en tenir compte pour le futur script qui crée les comptes de démo.
- La CLI Prisma charge toujours `packages/db/prisma.config.ts` avec son propre
  chargeur. Elle n'est pas concernée.
- Ce changement ne contredit aucun ADR précédent.
