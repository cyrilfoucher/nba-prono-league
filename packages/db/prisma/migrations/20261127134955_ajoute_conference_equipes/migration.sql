-- Ajoute la conférence (Est ou Ouest) aux équipes.
-- Les 30 équipes existent déjà en base : on ajoute d'abord la colonne sans contrainte,
-- on remplit la conférence de chaque équipe, puis on rend la colonne obligatoire.
-- Si une équipe n'est pas dans les listes, le SET NOT NULL échoue et la migration est annulée.

-- CreateEnum
CREATE TYPE "Conference" AS ENUM ('East', 'West');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "conference" "Conference";

UPDATE "Team" SET "conference" = 'East'
WHERE "abbreviation" IN (
  'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DET', 'IND',
  'MIA', 'MIL', 'NYK', 'ORL', 'PHI', 'TOR', 'WAS'
);

UPDATE "Team" SET "conference" = 'West'
WHERE "abbreviation" IN (
  'DAL', 'DEN', 'GSW', 'HOU', 'LAC', 'LAL', 'MEM', 'MIN',
  'NOP', 'OKC', 'PHX', 'POR', 'SAC', 'SAS', 'UTA'
);

ALTER TABLE "Team" ALTER COLUMN "conference" SET NOT NULL;
