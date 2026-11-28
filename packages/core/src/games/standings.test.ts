import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gamesResponseSchema } from "../balldontlie/schemas";
import { toGame } from "../balldontlie/to-game";
import { getStandings, type Standing } from "./standings";
import type { Game, GameStatus, Team } from "./types";

const fixture = gamesResponseSchema.parse(
  JSON.parse(
    readFileSync(new URL("../balldontlie/fixtures/games-2026-11-22.json", import.meta.url), "utf8"),
  ),
);

// Les 7 matchs réels du 22/11/2026, tous terminés.
const fixtureGames: Game[] = fixture.data.map(toGame);

function gameById(id: number): Game {
  const game = fixtureGames.find((g) => g.id === id);
  if (!game) {
    throw new Error(`Match ${String(id)} absent de la fixture`);
  }
  return game;
}

const teams = new Map<string, Team>(
  fixtureGames.flatMap((g) => [g.homeTeam, g.visitorTeam]).map((t) => [t.abbreviation, t]),
);

function team(abbreviation: string): Team {
  const found = teams.get(abbreviation);
  if (!found) {
    throw new Error(`Équipe ${abbreviation} absente de la fixture`);
  }
  return found;
}

// Match dérivé d'un vrai match de la fixture : vraies équipes, scores et statut modifiés.
function derived(
  baseId: number,
  home: string,
  visitor: string,
  homeScore: number | null,
  visitorScore: number | null,
  status: GameStatus = "final",
): Game {
  return {
    ...gameById(baseId),
    homeTeam: team(home),
    visitorTeam: team(visitor),
    homeScore,
    visitorScore,
    status,
  };
}

function summary(standings: Standing[]) {
  return standings.map((s) => ({
    team: s.team.abbreviation,
    wins: s.wins,
    losses: s.losses,
    gamesBehind: s.gamesBehind,
  }));
}

// ATL 107 - 97 DET, MIA 123 - 113 OKC, WAS 116 - 96 ORL, CHI 145 - 151 DEN,
// UTA 114 - 116 DAL, NYK 113 - 106 IND, GSW 88 - 87 BOS.
const atlDet = gameById(21718162);
const miaOkc = gameById(21718163);
const wasOrl = gameById(21718165);
const utaDal = gameById(21718167);

// ATL 3-0, MIA 1-1, DET 0-1, ORL 0-1, WAS 0-1.
const atlLeads = [
  atlDet,
  derived(21718163, "MIA", "ATL", 100, 110),
  derived(21718165, "ATL", "WAS", 120, 101),
  derived(21718169, "MIA", "ORL", 104, 99),
];

describe("getStandings", () => {
  it("construit le classement de l'Est à partir des vrais matchs de la fixture", () => {
    expect(summary(getStandings(fixtureGames, "East"))).toEqual([
      { team: "ATL", wins: 1, losses: 0, gamesBehind: 0 },
      { team: "MIA", wins: 1, losses: 0, gamesBehind: 0 },
      { team: "NYK", wins: 1, losses: 0, gamesBehind: 0 },
      { team: "WAS", wins: 1, losses: 0, gamesBehind: 0 },
      { team: "BOS", wins: 0, losses: 1, gamesBehind: 1 },
      { team: "CHI", wins: 0, losses: 1, gamesBehind: 1 },
      { team: "DET", wins: 0, losses: 1, gamesBehind: 1 },
      { team: "IND", wins: 0, losses: 1, gamesBehind: 1 },
      { team: "ORL", wins: 0, losses: 1, gamesBehind: 1 },
    ]);
  });

  it("construit le classement de toute la ligue sans conférence", () => {
    const standings = getStandings(fixtureGames);

    // 7 matchs : 7 vainqueurs à 1-0 puis 7 perdants à 0-1, triés par ordre alphabétique.
    expect(standings).toHaveLength(14);
    expect(summary(standings).map((s) => s.team)).toEqual([
      "ATL",
      "DAL",
      "DEN",
      "GSW",
      "MIA",
      "NYK",
      "WAS",
      "BOS",
      "CHI",
      "DET",
      "IND",
      "OKC",
      "ORL",
      "UTA",
    ]);
    expect(standings.map((s) => s.gamesBehind)).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]);
  });

  it("construit le classement de l'Ouest à partir des vrais matchs de la fixture", () => {
    expect(summary(getStandings(fixtureGames, "West"))).toEqual([
      { team: "DAL", wins: 1, losses: 0, gamesBehind: 0 },
      { team: "DEN", wins: 1, losses: 0, gamesBehind: 0 },
      { team: "GSW", wins: 1, losses: 0, gamesBehind: 0 },
      { team: "OKC", wins: 0, losses: 1, gamesBehind: 1 },
      { team: "UTA", wins: 0, losses: 1, gamesBehind: 1 },
    ]);
  });

  it("renvoie l'équipe complète (id, nom, abréviation, conférence)", () => {
    const [first] = getStandings([atlDet], "East");

    expect(first?.team).toEqual({
      id: 1,
      name: "Atlanta Hawks",
      abbreviation: "ATL",
      conference: "East",
    });
  });

  describe("matchs non terminés", () => {
    it.each(["scheduled", "in_progress", "postponed", "canceled"] as const)(
      "ignore un match au statut %s",
      (status) => {
        const standings = getStandings([{ ...atlDet, status }, wasOrl], "East");

        expect(summary(standings)).toEqual([
          { team: "WAS", wins: 1, losses: 0, gamesBehind: 0 },
          { team: "ORL", wins: 0, losses: 1, gamesBehind: 1 },
        ]);
      },
    );

    it("ignore un match terminé dont un score manque", () => {
      const standings = getStandings(
        [
          { ...atlDet, homeScore: null },
          { ...miaOkc, visitorScore: null },
        ],
        "East",
      );

      expect(standings).toEqual([]);
    });

    it("ignore un match terminé à égalité (donnée erronée)", () => {
      expect(getStandings([{ ...atlDet, homeScore: 100, visitorScore: 100 }], "East")).toEqual([]);
    });

    it("renvoie un tableau vide si aucun match n'est terminé", () => {
      const scheduled = fixtureGames.map((g) => ({
        ...g,
        status: "scheduled" as const,
        homeScore: null,
        visitorScore: null,
      }));

      expect(getStandings(scheduled, "East")).toEqual([]);
      expect(getStandings(scheduled, "West")).toEqual([]);
    });
  });

  describe("victoires et défaites", () => {
    it("compte les victoires à domicile et à l'extérieur", () => {
      const atl = getStandings(atlLeads, "East").find((s) => s.team.abbreviation === "ATL");

      // 2 victoires à domicile (DET, WAS) et 1 à l'extérieur (chez MIA).
      expect(atl).toMatchObject({ wins: 3, losses: 0 });
    });

    it("compte les défaites à domicile et à l'extérieur", () => {
      const standings = getStandings(atlLeads, "East");
      const byAbbr = (abbr: string) => standings.find((s) => s.team.abbreviation === abbr);

      // MIA perd à domicile contre ATL et gagne à domicile contre ORL.
      expect(byAbbr("MIA")).toMatchObject({ wins: 1, losses: 1 });
      // DET et WAS perdent à l'extérieur.
      expect(byAbbr("DET")).toMatchObject({ wins: 0, losses: 1 });
      expect(byAbbr("WAS")).toMatchObject({ wins: 0, losses: 1 });
    });

    it("compte la victoire de l'équipe à l'extérieur (vrai match CHI 145 - 151 DEN)", () => {
      const [den] = getStandings([gameById(21718166)], "West");
      const [chi] = getStandings([gameById(21718166)], "East");

      expect(den).toMatchObject({ wins: 1, losses: 0 });
      expect(chi).toMatchObject({ wins: 0, losses: 1 });
    });
  });

  describe("filtre par conférence", () => {
    it("exclut l'équipe de l'Ouest mais garde le bilan de son adversaire de l'Est", () => {
      // MIA (Est) bat OKC (Ouest), GSW (Ouest) bat BOS (Est).
      const standings = getStandings([miaOkc, gameById(21718170)], "East");

      expect(summary(standings)).toEqual([
        { team: "MIA", wins: 1, losses: 0, gamesBehind: 0 },
        { team: "BOS", wins: 0, losses: 1, gamesBehind: 1 },
      ]);
      expect(standings.every((s) => s.team.conference === "East")).toBe(true);
    });

    it("exclut l'équipe de l'Est du classement de l'Ouest", () => {
      const standings = getStandings([miaOkc, gameById(21718170)], "West");

      expect(summary(standings)).toEqual([
        { team: "GSW", wins: 1, losses: 0, gamesBehind: 0 },
        { team: "OKC", wins: 0, losses: 1, gamesBehind: 1 },
      ]);
    });

    it("renvoie un tableau vide pour une conférence sans aucun match", () => {
      // UTA - DAL : deux équipes de l'Ouest.
      expect(getStandings([utaDal], "East")).toEqual([]);
    });
  });

  describe("pourcentage de victoires", () => {
    it("vaut victoires / (victoires + défaites)", () => {
      // NYK 2-1 : bat IND (vrai match), gagne chez BOS, perd chez DEN.
      const games = [
        gameById(21718169),
        derived(21718170, "BOS", "NYK", 98, 105),
        derived(21718166, "DEN", "NYK", 112, 109),
      ];
      const nyk = getStandings(games, "East").find((s) => s.team.abbreviation === "NYK");

      expect(nyk?.winPercentage).toBeCloseTo(2 / 3);
    });

    it("vaut 1 pour une équipe invaincue et 0 pour une équipe sans victoire", () => {
      const standings = getStandings(atlLeads, "East");

      expect(standings.map((s) => [s.team.abbreviation, s.winPercentage])).toEqual([
        ["ATL", 1],
        ["MIA", 0.5],
        ["DET", 0],
        ["ORL", 0],
        ["WAS", 0],
      ]);
    });
  });

  describe("tri", () => {
    it("classe d'abord par pourcentage, même avec moins de victoires", () => {
      // MIA 1-0 (100 %) devant NYK 2-1 (67 %).
      const games = [
        miaOkc,
        gameById(21718169),
        derived(21718170, "BOS", "NYK", 98, 105),
        derived(21718166, "DEN", "NYK", 112, 109),
      ];

      const [first, second] = getStandings(games, "East");

      expect(first?.team.abbreviation).toBe("MIA");
      expect(second?.team.abbreviation).toBe("NYK");
    });

    it("à pourcentage égal, classe d'abord l'équipe qui a le plus de victoires", () => {
      // WAS 2-0 devant ATL 1-0, bien que « Atlanta » soit avant « Washington ».
      const games = [atlDet, wasOrl, derived(21718166, "CHI", "WAS", 101, 115)];

      expect(summary(getStandings(games, "East")).slice(0, 2)).toEqual([
        { team: "WAS", wins: 2, losses: 0, gamesBehind: 0 },
        { team: "ATL", wins: 1, losses: 0, gamesBehind: 0.5 },
      ]);
    });

    it("à pourcentage et victoires égaux, classe par ordre alphabétique du nom", () => {
      // Dans la fixture, NYK est rencontrée après WAS : le tri ne suit pas l'ordre des matchs.
      const names = getStandings(fixtureGames, "East").map((s) => s.team.name);

      expect(names).toEqual([
        "Atlanta Hawks",
        "Miami Heat",
        "New York Knicks",
        "Washington Wizards",
        "Boston Celtics",
        "Chicago Bulls",
        "Detroit Pistons",
        "Indiana Pacers",
        "Orlando Magic",
      ]);
    });

    it("ne dépend pas de l'ordre des matchs en entrée", () => {
      const reversed = [...atlLeads].reverse();

      expect(getStandings(reversed, "East")).toEqual(getStandings(atlLeads, "East"));
    });
  });

  describe("écart avec le premier (gamesBehind)", () => {
    it("vaut 0 pour le leader et des demi-matchs pour les autres", () => {
      // ATL 3-0 ; MIA 1-1 → ((3 - 1) + (1 - 0)) / 2 = 1.5 ; 0-1 → ((3 - 0) + (1 - 0)) / 2 = 2.
      expect(summary(getStandings(atlLeads, "East"))).toEqual([
        { team: "ATL", wins: 3, losses: 0, gamesBehind: 0 },
        { team: "MIA", wins: 1, losses: 1, gamesBehind: 1.5 },
        { team: "DET", wins: 0, losses: 1, gamesBehind: 2 },
        { team: "ORL", wins: 0, losses: 1, gamesBehind: 2 },
        { team: "WAS", wins: 0, losses: 1, gamesBehind: 2 },
      ]);
    });

    it("se calcule par rapport au leader de chaque conférence", () => {
      // Ouest : DAL 2-0 (bat UTA, gagne chez DEN), DEN 0-1, UTA 0-1.
      const games = [...atlLeads, utaDal, derived(21718166, "DEN", "DAL", 99, 103)];

      expect(summary(getStandings(games, "West"))).toEqual([
        { team: "DAL", wins: 2, losses: 0, gamesBehind: 0 },
        { team: "DEN", wins: 0, losses: 1, gamesBehind: 1.5 },
        { team: "UTA", wins: 0, losses: 1, gamesBehind: 1.5 },
      ]);
      expect(getStandings(games, "East")[0]).toMatchObject({ wins: 3, gamesBehind: 0 });
    });

    it("peut être négatif quand le leader a joué moins de matchs (comme les classements NBA)", () => {
      // ATL 1-0 (100 %) passe devant MIA 5-1 (83 %) : ((1 - 5) + (1 - 0)) / 2 = -1.5.
      const games = [
        derived(21718162, "ATL", "WAS", 110, 100),
        derived(21718162, "MIA", "DET", 110, 100),
        derived(21718162, "MIA", "ORL", 110, 100),
        derived(21718162, "MIA", "BOS", 110, 100),
        derived(21718162, "MIA", "CHI", 110, 100),
        derived(21718162, "MIA", "IND", 110, 100),
        // Défaite contre une équipe de l'Ouest, absente du classement de l'Est.
        derived(21718162, "MIA", "OKC", 100, 110),
      ];

      const [leader, second] = getStandings(games, "East");

      expect(leader).toMatchObject({ wins: 1, losses: 0, gamesBehind: 0 });
      expect(second).toMatchObject({ wins: 5, losses: 1, gamesBehind: -1.5 });
    });

    it("vaut 0 pour une équipe à égalité parfaite avec le leader", () => {
      const standings = getStandings(fixtureGames, "West");

      expect(standings.slice(0, 3).map((s) => s.gamesBehind)).toEqual([0, 0, 0]);
    });
  });

  it("renvoie un tableau vide pour une liste de matchs vide", () => {
    expect(getStandings([], "East")).toEqual([]);
    expect(getStandings([], "West")).toEqual([]);
    expect(getStandings([])).toEqual([]);
  });
});
