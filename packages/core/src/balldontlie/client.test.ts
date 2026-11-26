import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z, ZodError } from "zod";
import { fetchGamesByDates } from "./client";
import { gamesResponseSchema } from "./schemas";
import { toGame } from "./to-game";

const rawFixture = readFileSync(
  new URL("./fixtures/games-2026-11-22.json", import.meta.url),
  "utf8",
);
const fixture = gamesResponseSchema.parse(JSON.parse(rawFixture));
// Les matchs bruts sont gardés tels quels pour découper la fixture en deux pages.
const rawGames = z.object({ data: z.array(z.unknown()) }).parse(JSON.parse(rawFixture)).data;

const API_KEY = "test-api-key";
const DATES = ["2026-11-22"];
const MANY_DATES = ["2026-11-21", "2026-11-22", "2026-11-23"];

const FIRST_PAGE_SIZE = 4;
const firstPageCursor = fixture.data[FIRST_PAGE_SIZE - 1]?.id;
const firstPageBody = JSON.stringify({
  data: rawGames.slice(0, FIRST_PAGE_SIZE),
  meta: { per_page: 25, next_cursor: firstPageCursor },
});
const secondPageBody = JSON.stringify({
  data: rawGames.slice(FIRST_PAGE_SIZE),
  meta: { per_page: 25 },
});

function calledUrl(index: number): URL {
  const input = vi.mocked(fetch).mock.calls[index]?.[0];
  if (!(input instanceof URL)) {
    throw new Error("fetch doit recevoir un objet URL");
  }
  return input;
}

function mockTwoPages() {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(firstPageBody, { status: 200 }))
    .mockResolvedValueOnce(new Response(secondPageBody, { status: 200 }));
}

describe("fetchGamesByDates", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renvoie un tableau vide sans appeler l'API quand aucune date n'est demandée", async () => {
    await expect(fetchGamesByDates([], API_KEY)).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("vérifie que la fixture découpée est cohérente", () => {
    expect(fixture.data).toHaveLength(7);
    expect(firstPageCursor).toBe(21718166);
  });

  describe("une seule page", () => {
    beforeEach(() => {
      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(new Response(rawFixture, { status: 200 })),
      );
    });

    it("renvoie les matchs de la réponse en un seul appel", async () => {
      const games = await fetchGamesByDates(DATES, API_KEY);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(games).toHaveLength(7);
      expect(games).toEqual(fixture.data.map(toGame));
    });

    it("appelle l'API avec toutes les dates dans l'ordre, per_page et la clé", async () => {
      await fetchGamesByDates(MANY_DATES, API_KEY);

      const url = calledUrl(0);
      expect(url.origin + url.pathname).toBe("https://api.balldontlie.io/v1/games");
      expect(url.searchParams.getAll("dates[]")).toEqual(MANY_DATES);
      expect(url.searchParams.get("per_page")).toBe("100");
      expect(url.searchParams.get("cursor")).toBeNull();
      expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
        headers: { Authorization: API_KEY },
      });
    });
  });

  describe("plusieurs pages", () => {
    it("suit next_cursor et concatène les matchs dans l'ordre", async () => {
      mockTwoPages();

      const games = await fetchGamesByDates(DATES, API_KEY);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(games).toHaveLength(7);
      expect(games).toEqual(fixture.data.map(toGame));
    });

    it("répète les dates, per_page et la clé sur chaque page, et passe le cursor à la 2e", async () => {
      mockTwoPages();

      await fetchGamesByDates(MANY_DATES, API_KEY);

      const first = calledUrl(0);
      const second = calledUrl(1);
      for (const url of [first, second]) {
        expect(url.searchParams.getAll("dates[]")).toEqual(MANY_DATES);
        expect(url.searchParams.get("per_page")).toBe("100");
      }
      expect(first.searchParams.get("cursor")).toBeNull();
      expect(second.searchParams.get("cursor")).toBe(String(firstPageCursor));
      for (const call of vi.mocked(fetch).mock.calls) {
        expect(call[1]).toMatchObject({ headers: { Authorization: API_KEY } });
      }
    });

    it("rejette sans résultat partiel si la 2e page échoue", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response(firstPageBody, { status: 200 }))
        .mockResolvedValueOnce(new Response(null, { status: 429 }));

      await expect(fetchGamesByDates(DATES, API_KEY)).rejects.toThrow(
        "Quota BALLDONTLIE dépassé, réessayer plus tard",
      );
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("erreurs", () => {
    it("rejette si la clé est invalide (401)", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

      await expect(fetchGamesByDates(DATES, API_KEY)).rejects.toThrow(
        "Clé API BALLDONTLIE absente ou invalide",
      );
    });

    it("rejette si le quota est dépassé (429)", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 429 }));

      await expect(fetchGamesByDates(DATES, API_KEY)).rejects.toThrow(
        "Quota BALLDONTLIE dépassé, réessayer plus tard",
      );
    });

    it.each([500, 503])("rejette avec le code %i si le serveur échoue", async (status) => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status }));

      await expect(fetchGamesByDates(DATES, API_KEY)).rejects.toThrow(
        `Erreur de l'API BALLDONTLIE (code ${String(status)})`,
      );
    });

    it("rejette si l'API est injoignable", async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));

      await expect(fetchGamesByDates(DATES, API_KEY)).rejects.toThrow(
        "API BALLDONTLIE injoignable",
      );
    });

    it("rejette avec la ZodError en cause si la réponse est hors schéma", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: "abc" }] }), { status: 200 }),
      );

      const error: unknown = await fetchGamesByDates(DATES, API_KEY).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(Error);
      if (!(error instanceof Error)) return;
      expect(error.message).toBe("Réponse BALLDONTLIE inattendue");
      expect(error.cause).toBeInstanceOf(ZodError);
    });

    it("rejette si le corps de la réponse n'est pas du JSON", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("<html>", { status: 200 }));

      await expect(fetchGamesByDates(DATES, API_KEY)).rejects.toThrow(
        "Réponse BALLDONTLIE inattendue",
      );
    });
  });
});
