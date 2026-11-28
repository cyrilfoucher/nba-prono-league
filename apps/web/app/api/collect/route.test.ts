import { fetchGamesByDates, type Game } from "@repo/core";
import { prisma, saveGames } from "@repo/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// Seul l'appel à l'API est simulé : les fonctions de dates gardent leur vraie implémentation.
vi.mock("@repo/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/core")>()),
  fetchGamesByDates: vi.fn(),
}));
// La fabrique remplace tout le module : le vrai client Prisma n'est jamais chargé.
vi.mock("@repo/db", () => ({ prisma: { fake: "prisma" }, saveGames: vi.fn() }));

const CRON_SECRET = "test-cron-secret";
const API_KEY = "test-api-key";

const COLLECT_DATES = [
  "2026-11-21",
  "2026-11-22",
  "2026-11-23",
  "2026-11-24",
  "2026-11-25",
  "2026-11-26",
  "2026-11-27",
  "2026-11-28",
  "2026-11-29",
];

// Match ATL-DET de la fixture games-2026-11-22.json, tel que le renvoie toGame.
const atlDet: Game = {
  id: 21718162,
  startsAt: new Date("2026-11-22T20:30:00.000Z"),
  status: "final",
  homeTeam: { id: 1, name: "Atlanta Hawks", abbreviation: "ATL", conference: "East" },
  visitorTeam: { id: 9, name: "Detroit Pistons", abbreviation: "DET", conference: "East" },
  homeScore: 107,
  visitorScore: 97,
};

const PERIOD_ERROR = {
  error:
    "Période invalide : du et au attendus au format AAAA-MM-JJ, dans la saison en cours, du avant au",
};

function collectRequest(query = "", authorization: string | null = `Bearer ${CRON_SECRET}`) {
  const headers = new Headers();
  if (authorization !== null) {
    headers.set("authorization", authorization);
  }
  return new Request(`http://localhost/api/collect${query}`, { headers });
}

describe("GET /api/collect", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    vi.stubEnv("BALLDONTLIE_API_KEY", API_KEY);
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.mocked(fetchGamesByDates).mockResolvedValue([atlDet]);
    vi.mocked(saveGames).mockResolvedValue(1);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  describe("configuration et authentification", () => {
    it("renvoie 500 avec le nom de la variable si CRON_SECRET est absent", async () => {
      vi.stubEnv("CRON_SECRET", undefined);

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Variable d'environnement manquante : CRON_SECRET",
      });
      expect(fetchGamesByDates).not.toHaveBeenCalled();
    });

    it("renvoie 401 sans en-tête Authorization", async () => {
      const response = await GET(collectRequest("?date=2026-11-22", null));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Non autorisé" });
      expect(fetchGamesByDates).not.toHaveBeenCalled();
    });

    it("renvoie 401 avec un mauvais secret de même longueur", async () => {
      const wrong = "x".repeat(CRON_SECRET.length);

      const response = await GET(collectRequest("?date=2026-11-22", `Bearer ${wrong}`));

      expect(response.status).toBe(401);
      expect(fetchGamesByDates).not.toHaveBeenCalled();
    });

    it("renvoie 401 sans exception avec un secret de longueur différente", async () => {
      const response = await GET(collectRequest("?date=2026-11-22", "Bearer court"));

      expect(response.status).toBe(401);
      expect(fetchGamesByDates).not.toHaveBeenCalled();
    });

    it("renvoie 401 avec le secret sans le préfixe Bearer", async () => {
      const response = await GET(collectRequest("?date=2026-11-22", CRON_SECRET));

      expect(response.status).toBe(401);
    });

    it("ne révèle pas une clé BALLDONTLIE manquante à un appelant non authentifié", async () => {
      vi.stubEnv("BALLDONTLIE_API_KEY", undefined);

      const response = await GET(collectRequest("?date=2026-11-22", null));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Non autorisé" });
    });

    it("renvoie 500 avec le nom si BALLDONTLIE_API_KEY manque", async () => {
      vi.stubEnv("BALLDONTLIE_API_KEY", undefined);

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Variable d'environnement manquante : BALLDONTLIE_API_KEY",
      });
      expect(fetchGamesByDates).not.toHaveBeenCalled();
    });

    it("renvoie 500 avec le nom si DATABASE_URL manque", async () => {
      vi.stubEnv("DATABASE_URL", undefined);

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Variable d'environnement manquante : DATABASE_URL",
      });
      expect(fetchGamesByDates).not.toHaveBeenCalled();
    });

    it("traite une variable vide comme absente", async () => {
      vi.stubEnv("BALLDONTLIE_API_KEY", "");

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(500);
    });
  });

  describe("paramètre date", () => {
    it.each(["22-11-2026", "2026-02-31", "2026-13-01", "", "2026-11-22T00:00:00Z"])(
      "renvoie 400 pour la date invalide %j",
      async (date) => {
        const response = await GET(collectRequest(`?date=${encodeURIComponent(date)}`));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
          error: "Paramètre date invalide, format attendu AAAA-MM-JJ",
        });
        expect(fetchGamesByDates).not.toHaveBeenCalled();
      },
    );

    it("accepte le 29 février d'une année bissextile", async () => {
      const response = await GET(collectRequest("?date=2028-02-29"));

      expect(response.status).toBe(200);
      expect(fetchGamesByDates).toHaveBeenCalledExactlyOnceWith(["2028-02-29"], API_KEY);
      await expect(response.json()).resolves.toEqual({ dates: ["2028-02-29"], saved: 1 });
    });

    it("collecte la veille, le jour de New York et les 7 jours suivants sans paramètre", async () => {
      vi.useFakeTimers();
      // 3 h UTC le 23 novembre = 22 h la veille à New York.
      vi.setSystemTime(new Date("2026-11-23T03:00:00Z"));

      const response = await GET(collectRequest());

      expect(response.status).toBe(200);
      expect(fetchGamesByDates).toHaveBeenCalledExactlyOnceWith(COLLECT_DATES, API_KEY);
      await expect(response.json()).resolves.toEqual({ dates: COLLECT_DATES, saved: 1 });
    });
  });

  describe("paramètres du et au", () => {
    // Midi UTC le 27 novembre 2026 = 13 h à Paris : aujourd'hui est le 2026-11-27.
    // La saison commence le 2026-10-20 ; le dernier jour disponible est aujourd'hui + 7 = 2026-12-04.
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));
    });

    it("récupère et enregistre tous les jours de la période, bornes incluses", async () => {
      const period = ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"];

      const response = await GET(collectRequest("?du=2026-11-20&au=2026-11-23"));

      expect(response.status).toBe(200);
      expect(fetchGamesByDates).toHaveBeenCalledExactlyOnceWith(period, API_KEY);
      expect(saveGames).toHaveBeenCalledExactlyOnceWith(prisma, [atlDet]);
      await expect(response.json()).resolves.toEqual({ dates: period, saved: 1 });
    });

    it("accepte une période d'un seul jour", async () => {
      const response = await GET(collectRequest("?du=2026-11-22&au=2026-11-22"));

      expect(response.status).toBe(200);
      expect(fetchGamesByDates).toHaveBeenCalledExactlyOnceWith(["2026-11-22"], API_KEY);
    });

    it("accepte les deux extrémités de la saison disponible et passe au mois suivant", async () => {
      const response = await GET(collectRequest("?du=2026-10-20&au=2026-12-04"));

      expect(response.status).toBe(200);
      const [dates] = vi.mocked(fetchGamesByDates).mock.calls[0] ?? [];
      expect(dates).toHaveLength(46);
      expect(dates?.[0]).toBe("2026-10-20");
      expect(dates).toContain("2026-10-31");
      expect(dates).toContain("2026-11-01");
      expect(dates?.at(-1)).toBe("2026-12-04");
    });

    it("se base sur le jour de Paris : à 23 h 30 UTC, Paris est déjà le lendemain", async () => {
      // 2026-11-27T23:30Z = 00:30 le 28 à Paris : le dernier jour disponible devient le 2026-12-05.
      vi.setSystemTime(new Date("2026-11-27T23:30:00Z"));

      const response = await GET(collectRequest("?du=2026-12-05&au=2026-12-05"));

      expect(response.status).toBe(200);
      expect(fetchGamesByDates).toHaveBeenCalledExactlyOnceWith(["2026-12-05"], API_KEY);
    });

    it.each([
      ["du sans au", "?du=2026-11-20"],
      ["au sans du", "?au=2026-11-23"],
      ["du vide", "?du=&au=2026-11-23"],
      ["au vide", "?du=2026-11-20&au="],
    ])("renvoie 400 avec %s", async (_label, query) => {
      const response = await GET(collectRequest(query));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual(PERIOD_ERROR);
      expect(fetchGamesByDates).not.toHaveBeenCalled();
      expect(saveGames).not.toHaveBeenCalled();
    });

    it.each([
      ["du la veille du début de saison", "?du=2026-10-19&au=2026-11-23"],
      ["au le lendemain du dernier jour disponible", "?du=2026-11-20&au=2026-12-05"],
      ["une période de la saison précédente", "?du=2026-03-01&au=2026-03-05"],
      ["une période lointaine dans le futur", "?du=2042-01-01&au=2042-01-02"],
    ])("renvoie 400 pour %s", async (_label, query) => {
      const response = await GET(collectRequest(query));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual(PERIOD_ERROR);
      expect(fetchGamesByDates).not.toHaveBeenCalled();
    });

    it.each([
      ["du au mauvais format", "?du=20-11-2026&au=2026-11-23"],
      ["au inexistant", "?du=2026-11-20&au=2026-11-31"],
      ["du avec une heure", `?du=${encodeURIComponent("2026-11-20T00:00:00Z")}&au=2026-11-23`],
    ])("renvoie 400 pour %s", async (_label, query) => {
      const response = await GET(collectRequest(query));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual(PERIOD_ERROR);
      expect(fetchGamesByDates).not.toHaveBeenCalled();
    });

    it("renvoie 400 si du est après au", async () => {
      const response = await GET(collectRequest("?du=2026-11-23&au=2026-11-20"));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual(PERIOD_ERROR);
      expect(fetchGamesByDates).not.toHaveBeenCalled();
    });

    it("utilise la période plutôt que le paramètre date quand les deux sont fournis", async () => {
      const response = await GET(collectRequest("?date=2026-11-25&du=2026-11-20&au=2026-11-21"));

      expect(response.status).toBe(200);
      expect(fetchGamesByDates).toHaveBeenCalledExactlyOnceWith(
        ["2026-11-20", "2026-11-21"],
        API_KEY,
      );
    });

    it("vérifie l'authentification avant de valider la période", async () => {
      const response = await GET(collectRequest("?du=2026-11-23&au=2026-11-20", null));

      expect(response.status).toBe(401);
    });

    it("renvoie 502 si le quota BALLDONTLIE est dépassé pendant un rattrapage", async () => {
      vi.mocked(fetchGamesByDates).mockRejectedValue(
        new Error("Quota BALLDONTLIE dépassé, réessayer plus tard"),
      );

      const response = await GET(collectRequest("?du=2026-11-20&au=2026-11-23"));

      expect(response.status).toBe(502);
      expect(saveGames).not.toHaveBeenCalled();
    });
  });

  describe("collecte", () => {
    it("récupère puis enregistre les matchs de la date demandée", async () => {
      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ dates: ["2026-11-22"], saved: 1 });
      expect(fetchGamesByDates).toHaveBeenCalledExactlyOnceWith(["2026-11-22"], API_KEY);
      expect(saveGames).toHaveBeenCalledExactlyOnceWith(prisma, [atlDet]);
    });

    it("enregistre une liste vide quand il n'y a aucun match", async () => {
      vi.mocked(fetchGamesByDates).mockResolvedValue([]);
      vi.mocked(saveGames).mockResolvedValue(0);

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ dates: ["2026-11-22"], saved: 0 });
      expect(saveGames).toHaveBeenCalledWith(prisma, []);
    });

    it("renvoie 502 avec le message si le quota BALLDONTLIE est dépassé", async () => {
      vi.mocked(fetchGamesByDates).mockRejectedValue(
        new Error("Quota BALLDONTLIE dépassé, réessayer plus tard"),
      );

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(502);
      await expect(response.json()).resolves.toEqual({
        error: "Quota BALLDONTLIE dépassé, réessayer plus tard",
      });
      expect(saveGames).not.toHaveBeenCalled();
    });

    it("renvoie 502 si l'API BALLDONTLIE est injoignable", async () => {
      vi.mocked(fetchGamesByDates).mockRejectedValue(new Error("API BALLDONTLIE injoignable"));

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(502);
      await expect(response.json()).resolves.toEqual({ error: "API BALLDONTLIE injoignable" });
      expect(saveGames).not.toHaveBeenCalled();
    });

    it("renvoie 502 avec un message générique si l'erreur n'est pas une Error", async () => {
      vi.mocked(fetchGamesByDates).mockRejectedValue("panne");

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(502);
      await expect(response.json()).resolves.toEqual({
        error: "Erreur inconnue de l'API BALLDONTLIE",
      });
    });

    it("renvoie 500 si l'enregistrement en base échoue", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.mocked(saveGames).mockRejectedValue(new Error("connexion perdue"));

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Échec de l'enregistrement en base",
      });
      expect(consoleError).toHaveBeenCalledOnce();
    });
  });
});
