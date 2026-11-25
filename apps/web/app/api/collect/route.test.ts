import { fetchGamesByDate, type Game } from "@repo/core";
import { prisma, saveGames } from "@repo/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// Seul l'appel à l'API est simulé : isValidDate garde sa vraie implémentation.
vi.mock("@repo/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/core")>()),
  fetchGamesByDate: vi.fn(),
}));
// La fabrique remplace tout le module : le vrai client Prisma n'est jamais chargé.
vi.mock("@repo/db", () => ({ prisma: { fake: "prisma" }, saveGames: vi.fn() }));

const CRON_SECRET = "test-cron-secret";
const API_KEY = "test-api-key";

// Match ATL-DET de la fixture games-2026-11-22.json, tel que le renvoie toGame.
const atlDet: Game = {
  id: 21718162,
  startsAt: new Date("2026-11-22T20:30:00.000Z"),
  status: "final",
  homeTeam: { id: 1, name: "Atlanta Hawks", abbreviation: "ATL" },
  visitorTeam: { id: 9, name: "Detroit Pistons", abbreviation: "DET" },
  homeScore: 107,
  visitorScore: 97,
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
    vi.mocked(fetchGamesByDate).mockResolvedValue([atlDet]);
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
      expect(fetchGamesByDate).not.toHaveBeenCalled();
    });

    it("renvoie 401 sans en-tête Authorization", async () => {
      const response = await GET(collectRequest("?date=2026-11-22", null));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Non autorisé" });
      expect(fetchGamesByDate).not.toHaveBeenCalled();
    });

    it("renvoie 401 avec un mauvais secret de même longueur", async () => {
      const wrong = "x".repeat(CRON_SECRET.length);

      const response = await GET(collectRequest("?date=2026-11-22", `Bearer ${wrong}`));

      expect(response.status).toBe(401);
      expect(fetchGamesByDate).not.toHaveBeenCalled();
    });

    it("renvoie 401 sans exception avec un secret de longueur différente", async () => {
      const response = await GET(collectRequest("?date=2026-11-22", "Bearer court"));

      expect(response.status).toBe(401);
      expect(fetchGamesByDate).not.toHaveBeenCalled();
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
      expect(fetchGamesByDate).not.toHaveBeenCalled();
    });

    it("renvoie 500 avec le nom si DATABASE_URL manque", async () => {
      vi.stubEnv("DATABASE_URL", undefined);

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Variable d'environnement manquante : DATABASE_URL",
      });
      expect(fetchGamesByDate).not.toHaveBeenCalled();
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
        expect(fetchGamesByDate).not.toHaveBeenCalled();
      },
    );

    it("accepte le 29 février d'une année bissextile", async () => {
      const response = await GET(collectRequest("?date=2028-02-29"));

      expect(response.status).toBe(200);
      expect(fetchGamesByDate).toHaveBeenCalledWith("2028-02-29", API_KEY);
    });

    it("utilise la date du jour à New York quand aucune date n'est fournie", async () => {
      vi.useFakeTimers();
      // 3 h UTC le 23 novembre = 22 h la veille à New York.
      vi.setSystemTime(new Date("2026-11-23T03:00:00Z"));

      const response = await GET(collectRequest());

      expect(fetchGamesByDate).toHaveBeenCalledWith("2026-11-22", API_KEY);
      await expect(response.json()).resolves.toEqual({ date: "2026-11-22", saved: 1 });
    });
  });

  describe("collecte", () => {
    it("récupère puis enregistre les matchs de la date demandée", async () => {
      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ date: "2026-11-22", saved: 1 });
      expect(fetchGamesByDate).toHaveBeenCalledExactlyOnceWith("2026-11-22", API_KEY);
      expect(saveGames).toHaveBeenCalledExactlyOnceWith(prisma, [atlDet]);
    });

    it("enregistre une liste vide quand il n'y a aucun match", async () => {
      vi.mocked(fetchGamesByDate).mockResolvedValue([]);
      vi.mocked(saveGames).mockResolvedValue(0);

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ date: "2026-11-22", saved: 0 });
      expect(saveGames).toHaveBeenCalledWith(prisma, []);
    });

    it("renvoie 502 avec le message si le quota BALLDONTLIE est dépassé", async () => {
      vi.mocked(fetchGamesByDate).mockRejectedValue(
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
      vi.mocked(fetchGamesByDate).mockRejectedValue(new Error("API BALLDONTLIE injoignable"));

      const response = await GET(collectRequest("?date=2026-11-22"));

      expect(response.status).toBe(502);
      await expect(response.json()).resolves.toEqual({ error: "API BALLDONTLIE injoignable" });
      expect(saveGames).not.toHaveBeenCalled();
    });

    it("renvoie 502 avec un message générique si l'erreur n'est pas une Error", async () => {
      vi.mocked(fetchGamesByDate).mockRejectedValue("panne");

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
