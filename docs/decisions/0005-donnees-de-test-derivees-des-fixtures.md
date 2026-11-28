# 0005 — Données de test dérivées des fixtures réelles

- Date : 2026-11-28
- Statut : Acceptée

## Contexte

Le `CLAUDE.md` impose des données réelles de BALLDONTLIE, sans matchs ni
résultats inventés. Les tests suivent cette règle grâce aux fixtures : de vraies
réponses de l'API, enregistrées dans `packages/core/src/balldontlie/fixtures/`.

Le calcul du classement (`getStandings`, ticket #15) a fait apparaître une
limite : certains cas qu'il faut tester n'existent dans aucune vraie soirée de
matchs. Par exemple, un leader à 1-0 devant une équipe à 5-1 (écart négatif),
deux équipes à égalité parfaite, ou une conférence où une équipe a joué trois
matchs et les autres un seul. Pour les tester avec des données entièrement
réelles, il faudrait chercher et enregistrer des dizaines de soirées, en espérant
y trouver ces situations.

Options étudiées :

1. Uniquement des fixtures réelles, sans aucune modification.
2. Des données entièrement inventées (équipes et matchs fictifs).
3. Des données dérivées : on part d'un vrai match de la fixture (vraies équipes,
   vrai identifiant, vraie date) et on ne modifie que les scores, le statut ou
   l'affiche nécessaires au scénario.

## Décision

Option 3, pour les tests seulement. La règle « données réelles » reste entière
pour ce que l'appli affiche et ce que la base enregistre.

- Chaque donnée dérivée part d'un match de la fixture réelle (`derived(...)` dans
  `standings.test.ts`).
- Le commentaire du test indique ce qui a été modifié et pourquoi.
- Les tests qui vérifient le parcours complet (schéma, conversion, classement
  d'une vraie soirée) utilisent la fixture sans modification.

Alternatives écartées :

- **Fixtures réelles uniquement** : les cas limites resteraient sans test, alors
  que ce sont eux qui cassent le plus souvent.
- **Données inventées** : on perdrait la garantie que les équipes, les conférences
  et les formats correspondent à ce que renvoie vraiment l'API.

## Conséquences

- Les cas limites du classement sont couverts par des tests lisibles.
- Une donnée dérivée peut représenter une situation impossible en vrai : le
  commentaire du test doit le rendre évident pour le lecteur.
- Le `CLAUDE.md` précise cette exception, pour que les agents l'appliquent.
- Cette décision précise la règle « données réelles » du `CLAUDE.md` sans la
  contredire : elle ne concerne que les fichiers de test.
