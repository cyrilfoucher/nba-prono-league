import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAvailableDays,
  getCurrentParisDay,
  getParisDayRange,
  isAvailableDay,
  isValidDate,
  shiftDay,
} from "./day";

const ONE_HOUR_MS = 60 * 60 * 1000;

describe("getCurrentParisDay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["2026-11-25T22:59:59.999Z", "2026-11-25"],
    ["2026-11-25T23:00:00.000Z", "2026-11-26"],
    ["2026-07-14T21:59:59.999Z", "2026-07-14"],
    ["2026-07-14T22:00:00.000Z", "2026-07-15"],
    ["2026-12-31T23:00:00.000Z", "2027-01-01"],
    ["2026-03-28T23:00:00.000Z", "2026-03-29"],
    ["2026-10-24T22:00:00.000Z", "2026-10-25"],
    ["2026-10-25T22:59:59.999Z", "2026-10-25"],
  ])("à %s, le jour de Paris est %s", (instant, expected) => {
    expect(getCurrentParisDay(new Date(instant))).toBe(expected);
  });

  it("utilise l'heure actuelle si aucun instant n'est fourni", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T23:30:00.000Z"));

    expect(getCurrentParisDay()).toBe("2026-11-26");
  });
});

describe("getParisDayRange", () => {
  it("couvre 24 h un jour d'hiver (minuit Paris = 23:00 UTC la veille)", () => {
    const { start, end } = getParisDayRange("2026-11-26");

    expect(start.toISOString()).toBe("2026-11-25T23:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-26T23:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(24 * ONE_HOUR_MS);
  });

  it("couvre 24 h un jour d'été (minuit Paris = 22:00 UTC la veille)", () => {
    const { start, end } = getParisDayRange("2026-07-14");

    expect(start.toISOString()).toBe("2026-07-13T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-14T22:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(24 * ONE_HOUR_MS);
  });

  it("couvre 23 h le jour du passage à l'heure d'été (29 mars 2026)", () => {
    const { start, end } = getParisDayRange("2026-03-29");

    expect(start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(23 * ONE_HOUR_MS);
  });

  it("couvre 25 h le jour du passage à l'heure d'hiver (25 octobre 2026)", () => {
    const { start, end } = getParisDayRange("2026-10-25");

    expect(start.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(25 * ONE_HOUR_MS);
  });

  it("enchaîne les jours sans trou ni chevauchement", () => {
    const today = getParisDayRange("2026-10-25");
    const tomorrow = getParisDayRange("2026-10-26");

    expect(tomorrow.start.getTime()).toBe(today.end.getTime());
  });

  it("couvre le passage à la nouvelle année", () => {
    const { start, end } = getParisDayRange("2026-12-31");

    expect(start.toISOString()).toBe("2026-12-30T23:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });

  it("contient un match de la fixture du 22 novembre 2026 (coup d'envoi 2026-11-23T01:30Z)", () => {
    const { start, end } = getParisDayRange("2026-11-23");
    const startsAt = new Date("2026-11-23T01:30:00.000Z");

    expect(startsAt >= start && startsAt < end).toBe(true);
  });
});

describe("shiftDay", () => {
  it.each([
    ["2026-11-26", 1, "2026-11-27"],
    ["2026-11-26", -1, "2026-11-25"],
    ["2026-11-26", 0, "2026-11-26"],
    ["2026-11-30", 1, "2026-12-01"],
    ["2026-12-01", -1, "2026-11-30"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2027-01-01", -1, "2026-12-31"],
    ["2026-02-28", 1, "2026-03-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-02-29", 1, "2028-03-01"],
    ["2028-03-01", -1, "2028-02-29"],
    ["2026-03-28", 1, "2026-03-29"],
    ["2026-03-29", 1, "2026-03-30"],
    ["2026-10-24", 1, "2026-10-25"],
    ["2026-10-25", 1, "2026-10-26"],
    ["2026-10-26", -1, "2026-10-25"],
    ["2026-11-26", 365, "2027-11-26"],
    ["2026-11-26", -30, "2026-10-27"],
  ])("%s décalé de %i jour(s) donne %s", (date, days, expected) => {
    expect(shiftDay(date, days)).toBe(expected);
  });
});

describe("isValidDate", () => {
  it.each(["2026-11-26", "2026-01-01", "2026-12-31", "2028-02-29", "2000-02-29"])(
    "accepte %s",
    (value) => {
      expect(isValidDate(value)).toBe(true);
    },
  );

  it.each([
    "2026-02-31",
    "2026-02-29",
    "2100-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-11-00",
    "2026-11-32",
  ])("refuse la date inexistante %s", (value) => {
    expect(isValidDate(value)).toBe(false);
  });

  it.each([
    "2026-1-5",
    "26-11-26",
    "2026/11/26",
    "26/11/2026",
    "",
    "abc",
    "2026-11-26T00:00:00Z",
    " 2026-11-26",
    "2026-11-26 ",
    "2026-11-26\n",
    "２０２６-11-26",
  ])("refuse le format invalide %j", (value) => {
    expect(isValidDate(value)).toBe(false);
  });
});

describe("getAvailableDays", () => {
  it("va du début de la saison jusqu'à 7 jours après aujourd'hui", () => {
    expect(getAvailableDays("2026-11-26")).toEqual({ first: "2026-10-20", last: "2026-12-03" });
  });

  it("passe au mois et à l'année suivants", () => {
    expect(getAvailableDays("2026-12-28").last).toBe("2027-01-04");
  });
});

describe("isAvailableDay", () => {
  const today = "2026-11-26";

  it.each(["2026-10-20", "2026-11-26", "2026-12-03"])("accepte %s", (day) => {
    expect(isAvailableDay(day, today)).toBe(true);
  });

  it.each(["2026-10-19", "2026-12-04", "2042-01-01"])(
    "refuse %s, hors des jours disponibles",
    (day) => {
      expect(isAvailableDay(day, today)).toBe(false);
    },
  );

  it.each(["2026-02-31", "26-11-2026", ""])("refuse la date invalide %j", (day) => {
    expect(isAvailableDay(day, today)).toBe(false);
  });
});
