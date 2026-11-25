# 0004 — Three.js pour le ballon 3D de l'en-tête

- Date : 2026-11-25
- Statut : Acceptée

## Contexte

Le bouton du menu, dans l'en-tête, est un ballon de basket. La maquette prévoit
un ballon en relief qui tourne lentement sur lui-même, et qui accélère puis
ralentit quand on ouvre ou ferme le menu. Le ballon doit reprendre le motif
officiel d'un ballon NBA à 8 panneaux, sans logo ni inscription.

Ce ballon est purement décoratif. Il ne doit pas retarder l'affichage des
matchs, qui est le contenu principal de la page, et il doit rester sobre pour
les utilisateurs qui ont demandé moins d'animations
(`prefers-reduced-motion`).

Options étudiées :

1. Three.js : bibliothèque 3D sur WebGL, avec sphère, matériaux éclairés,
   textures et carte de relief prêtes à l'emploi.
2. CSS 3D : faire tourner une image avec `transform: rotateY()`.
3. Image animée ou vidéo : un GIF, une vidéo ou une suite d'images du ballon
   qui tourne.
4. Autres bibliothèques : React Three Fiber, Babylon.js, ou WebGL écrit à la
   main.

## Décision

Option 1 : **Three.js** (`three`, avec `@types/three` en dépendance de
développement), dans `apps/web/app/components/ball/`.

- La texture du cuir et des coutures n'est pas une image : elle est calculée
  par le code dans un canvas de 512 × 256 pixels, avec une carte de relief
  (grain du cuir, coutures creusées).
- Le ballon est un composant client chargé avec
  `next/dynamic(..., { ssr: false })`. Pendant le chargement, et côté serveur,
  l'en-tête affiche l'image fixe `public/ball.svg`.
- L'animation s'arrête quand le ballon n'est plus visible (IntersectionObserver)
  et quand `prefers-reduced-motion` est activé : une seule image fixe est alors
  dessinée. Le changement de réglage est pris en compte sans recharger la page.
- Au démontage, tout est libéré : boucle d'animation, observateurs, géométrie,
  matériau, textures, rendu WebGL et canvas.

Alternatives écartées :

- **CSS 3D** : une image plate qui tourne ne donne pas l'illusion d'une sphère.
  Les coutures ne suivent pas la surface et l'éclairage ne bouge pas.
- **Image animée ou vidéo** : poids comparable ou supérieur pour une qualité
  moindre (GIF limité à 256 couleurs, vidéo à fond transparent mal prise en
  charge). La vitesse ne peut pas réagir à l'ouverture du menu.
- **React Three Fiber** : ajoute une couche au-dessus de Three.js, donc plus de
  poids et une dépendance de plus, pour une scène qui ne contient qu'une sphère
  et trois lumières.
- **Babylon.js** : plus lourd que Three.js, pensé pour des jeux complets.
- **WebGL écrit à la main** : très léger, mais il faudrait écrire les shaders,
  l'éclairage et le relief soi-même. C'est beaucoup de code difficile à relire
  pour un élément décoratif.

## Poids ajouté

Mesures faites avec `pnpm build` (Next.js 16, Turbopack), dans
`apps/web/.next/static/chunks`, avant et après l'ajout du ballon 3D. Les tailles
compressées sont mesurées avec `gzip -9`.

| Mesure                                       | Avant     | Après       |
| -------------------------------------------- | --------- | ----------- |
| Dossier `static/chunks` (`du -sk`)           | 620 Ko    | 1 172 Ko    |
| JavaScript total, brut                       | 596 563 o | 1 159 612 o |
| JavaScript chargé au démarrage, brut         | 483 969 o | 488 437 o   |
| JavaScript chargé au démarrage, gzip         | 144 379 o | 145 765 o   |
| Fichier séparé du ballon 3D (Three.js), brut | —         | 544 201 o   |
| Fichier séparé du ballon 3D (Three.js), gzip | —         | 132 868 o   |

Three.js et le code du ballon sont regroupés dans un fichier séparé, qui n'est
ni dans les fichiers de démarrage de l'appli (`rootMainFiles` de
`build-manifest.json`) ni dans ceux de la page et du layout : il n'est
téléchargé qu'après l'affichage de la page, quand le ballon se monte. Le
chargement initial n'augmente que d'environ 1,4 Ko compressé, le code de
`next/dynamic`.

## Solution de repli

Si le navigateur ne peut pas créer de contexte WebGL (Three.js lève alors une
erreur à la création du rendu), le composant affiche l'image fixe
`public/ball.svg`, la même que pendant le chargement. Le bouton du menu
fonctionne de la même façon dans tous les cas : il garde son `aria-label` et son
`aria-expanded`, et le canvas est marqué `aria-hidden`.

## Conséquences

- Les matchs s'affichent sans attendre Three.js : le ballon 3D apparaît
  quelques instants plus tard, à la place de l'image fixe.
- Environ 133 Ko compressés sont téléchargés en plus, une fois, puis gardés en
  cache par le navigateur.
- Le ballon consomme du processeur graphique tant qu'il tourne : c'est pour cela
  qu'il s'arrête hors de l'écran et avec `prefers-reduced-motion`.
- Une dépendance de plus à tenir à jour. Three.js change parfois son API entre
  deux versions mineures : la version est fixée exactement dans
  `apps/web/package.json`.
- Le rendu 3D ne s'exécute pas dans Node.js : il n'est pas couvert par les tests
  Vitest, seulement vérifié dans un navigateur.
- Ce choix ne contredit aucun ADR précédent.
