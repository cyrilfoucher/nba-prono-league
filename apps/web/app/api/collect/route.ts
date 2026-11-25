import { createHash, timingSafeEqual } from "node:crypto";

import { fetchGamesByDate, type Game } from "@repo/core";
import { prisma, saveGames } from "@repo/db";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readEnv(name: string): string | null {
  const value = process.env[name];
  return value ? value : null;
}

function missingEnvResponse(name: string): Response {
  return Response.json({ error: `Variable d'environnement manquante : ${name}` }, { status: 500 });
}

function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization");
  if (header === null) {
    return false;
  }
  const received = createHash("sha256").update(header).digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(received, expected);
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  // Une date inexistante (2026-02-31) est décalée au mois suivant par Date.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Le calendrier NBA est daté à l'heure de New York.
function todayInNewYork(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: Request): Promise<Response> {
  const cronSecret = readEnv("CRON_SECRET");
  if (cronSecret === null) {
    return missingEnvResponse("CRON_SECRET");
  }

  if (!isAuthorized(request, cronSecret)) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const apiKey = readEnv("BALLDONTLIE_API_KEY");
  if (apiKey === null) {
    return missingEnvResponse("BALLDONTLIE_API_KEY");
  }
  if (readEnv("DATABASE_URL") === null) {
    return missingEnvResponse("DATABASE_URL");
  }

  const dateParam = new URL(request.url).searchParams.get("date");
  if (dateParam !== null && !isValidDate(dateParam)) {
    return Response.json(
      { error: "Paramètre date invalide, format attendu AAAA-MM-JJ" },
      { status: 400 },
    );
  }
  const date = dateParam ?? todayInNewYork();

  let games: Game[];
  try {
    games = await fetchGamesByDate(date, apiKey);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Erreur inconnue de l'API BALLDONTLIE",
      },
      { status: 502 },
    );
  }

  let saved: number;
  try {
    saved = await saveGames(prisma, games);
  } catch (error) {
    console.error("Échec de l'enregistrement des matchs en base", error);
    return Response.json({ error: "Échec de l'enregistrement en base" }, { status: 500 });
  }

  return Response.json({ date, saved });
}
