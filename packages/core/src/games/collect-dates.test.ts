import { afterEach, describe, expect, it, vi } from "vitest";
import { getCollectDates, getCurrentNewYorkDay } from "./collect-dates";
import { shiftDay } from "./day";

describe("getCurrentNewYorkDay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    // Hiver (EST, UTC-5) : minuit à New York = 05:00 UTC.
    ["2026-11-23T04:59:59.999Z", "2026-11-22"],
    ["2026-11-23T05:00:00.000Z", "2026-11-23"],
    // Été (EDT, UTC-4) : minuit à New York = 04:00 UTC.
    ["2026-07-15T03:59:59.999Z", "2026-07-14"],
    ["2026-07-15T04:00:00.000Z", "2026-07-15"],
    // 8 mars 2026, passage à l'heure d'été : journée de 23 h.
    ["2026-03-08T04:59:59.999Z", "2026-03-07"],
    ["2026-03-08T05:00:00.000Z", "2026-03-08"],
    ["2026-03-08T07:00:00.000Z", "2026-03-08"],
    ["2026-03-09T03:59:59.999Z", "2026-03-08"],
    ["2026-03-09T04:00:00.000Z", "2026-03-09"],
    // 1er novembre 2026, retour à l'heure d'hiver : journée de 25 h, 01:30 existe deux fois.
    ["2026-11-01T03:59:59.999Z", "2026-10-31"],
    ["2026-11-01T04:00:00.000Z", "2026-11-01"],
    ["2026-11-01T05:30:00.000Z", "2026-11-01"],
    ["2026-11-01T06:30:00.000Z", "2026-11-01"],
    ["2026-11-02T04:59:59.999Z", "2026-11-01"],
    ["2026-11-02T05:00:00.000Z", "2026-11-02"],
    // UTC et Paris sont déjà le 23, New York est encore le 22.
    ["2026-11-23T03:00:00.000Z", "2026-11-22"],
    ["2027-01-01T04:59:59.999Z", "2026-12-31"],
  ])("à %s, le jour de New York est %s", (instant, expected) => {
    expect(getCurrentNewYorkDay(new Date(instant))).toBe(expected);
  });

  it("utilise l'heure actuelle si aucun instant n'est fourni", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T03:00:00.000Z"));

    expect(getCurrentNewYorkDay()).toBe("2026-11-22");
  });
});

describe("getCollectDates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function expectConsecutive(dates: string[]) {
    expect(new Set(dates).size).toBe(dates.length);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBe(shiftDay(dates[i - 1] ?? "", 1));
    }
  }

  it("renvoie la veille, le jour de New York et les 7 jours suivants", () => {
    const dates = getCollectDates(new Date("2026-11-23T03:00:00.000Z"));

    expect(dates).toEqual([
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ]);
    expect(dates).toHaveLength(9);
    expect(dates[0]).toBe("2026-11-21");
    expect(dates[1]).toBe("2026-11-22");
    expect(dates[8]).toBe("2026-11-29");
    expectConsecutive(dates);
  });

  it.each([
    ["2026-11-23T04:59:59.999Z", "2026-11-21", "2026-11-29"],
    ["2026-11-23T05:00:00.000Z", "2026-11-22", "2026-11-30"],
  ])("à %s, la fenêtre va du %s au %s", (instant, first, last) => {
    const dates = getCollectDates(new Date(instant));

    expect(dates).toHaveLength(9);
    expect(dates[0]).toBe(first);
    expect(dates[8]).toBe(last);
    expectConsecutive(dates);
  });

  it("ne saute ni ne double aucun jour autour du passage à l'heure d'été (8 mars)", () => {
    const dates = getCollectDates(new Date("2026-03-07T17:00:00.000Z"));

    expect(dates).toEqual([
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
      "2026-03-14",
    ]);
  });

  it("ne saute ni ne double aucun jour autour du retour à l'heure d'hiver (1er novembre)", () => {
    const dates = getCollectDates(new Date("2026-10-30T16:00:00.000Z"));

    expect(dates).toEqual([
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
  });

  it.each([
    // 23:30 EST le 7 mars, quelques heures avant le passage à l'heure d'été.
    ["2026-03-08T04:30:00.000Z", "2026-03-06", "2026-03-07", "2026-03-14"],
    // 23:30 EDT le 31 octobre, quelques heures avant le retour à l'heure d'hiver.
    ["2026-11-01T03:30:00.000Z", "2026-10-30", "2026-10-31", "2026-11-07"],
  ])(
    "à %s (23:30 à New York), part de la veille du jour de New York",
    (instant, first, today, last) => {
      const dates = getCollectDates(new Date(instant));

      expect(dates[0]).toBe(first);
      expect(dates[1]).toBe(today);
      expect(dates[8]).toBe(last);
      expectConsecutive(dates);
    },
  );

  it("traverse le changement d'année", () => {
    const dates = getCollectDates(new Date("2026-12-28T12:00:00.000Z"));

    expect(dates).toEqual([
      "2026-12-27",
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
      "2027-01-04",
    ]);
  });

  it("inclut le 29 février d'une année bissextile", () => {
    const dates = getCollectDates(new Date("2028-02-27T12:00:00.000Z"));

    expect(dates).toEqual([
      "2028-02-26",
      "2028-02-27",
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
      "2028-03-02",
      "2028-03-03",
      "2028-03-04",
      "2028-03-05",
    ]);
  });

  it("utilise l'heure actuelle si aucun instant n'est fourni", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T03:00:00.000Z"));

    const dates = getCollectDates();

    expect(dates[0]).toBe("2026-11-21");
    expect(dates[1]).toBe("2026-11-22");
    expect(dates[8]).toBe("2026-11-29");
  });
});
