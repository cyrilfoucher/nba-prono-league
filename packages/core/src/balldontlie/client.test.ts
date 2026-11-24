import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { fetchGamesByDate } from "./client";
import { gamesResponseSchema } from "./schemas";
import { toGame } from "./to-game";

const rawFixture = readFileSync(
  new URL("./fixtures/games-2026-11-22.json", import.meta.url),
  "utf8",
);
const fixture = gamesResponseSchema.parse(JSON.parse(rawFixture));

const API_KEY = "test-api-key";
const DATE = "2026-11-22";

describe("fetchGamesByDate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renvoie les matchs de la réponse", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(rawFixture, { status: 200 }));

    const games = await fetchGamesByDate(DATE, API_KEY);

    expect(games).toHaveLength(7);
    expect(games).toEqual(fixture.data.map(toGame));
  });

  it("appelle l'API avec la date, per_page et la clé", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(rawFixture, { status: 200 }));

    await fetchGamesByDate(DATE, API_KEY);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [input, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    if (!(input instanceof URL)) {
      throw new Error("fetch doit recevoir un objet URL");
    }
    expect(input.searchParams.getAll("dates[]")).toEqual([DATE]);
    expect(input.searchParams.get("per_page")).toBe("100");
    expect(init).toMatchObject({ headers: { Authorization: API_KEY } });
  });

  it("rejette si la clé est invalide (401)", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

    await expect(fetchGamesByDate(DATE, API_KEY)).rejects.toThrow(
      "Clé API BALLDONTLIE absente ou invalide",
    );
  });

  it("rejette si le quota est dépassé (429)", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 429 }));

    await expect(fetchGamesByDate(DATE, API_KEY)).rejects.toThrow(
      "Quota BALLDONTLIE dépassé, réessayer plus tard",
    );
  });

  it.each([500, 503])("rejette avec le code %i si le serveur échoue", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status }));

    await expect(fetchGamesByDate(DATE, API_KEY)).rejects.toThrow(
      `Erreur de l'API BALLDONTLIE (code ${String(status)})`,
    );
  });

  it("rejette si l'API est injoignable", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));

    await expect(fetchGamesByDate(DATE, API_KEY)).rejects.toThrow("API BALLDONTLIE injoignable");
  });

  it("rejette avec la ZodError en cause si la réponse est hors schéma", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "abc" }] }), { status: 200 }),
    );

    const error: unknown = await fetchGamesByDate(DATE, API_KEY).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) return;
    expect(error.message).toBe("Réponse BALLDONTLIE inattendue");
    expect(error.cause).toBeInstanceOf(ZodError);
  });

  it("rejette si le corps de la réponse n'est pas du JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("<html>", { status: 200 }));

    await expect(fetchGamesByDate(DATE, API_KEY)).rejects.toThrow("Réponse BALLDONTLIE inattendue");
  });
});
