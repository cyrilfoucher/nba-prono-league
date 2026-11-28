import { describe, expect, it } from "vitest";

import { formatGamesBehind, formatWinPercentage, shortTeamName } from "./format";

describe("formatWinPercentage", () => {
  it.each([
    [0.6667, ".667"],
    [0.5, ".500"],
    [0, ".000"],
    [1, "1.000"],
    [12 / 19, ".632"],
  ])("affiche %d sous la forme %s", (value, expected) => {
    expect(formatWinPercentage(value)).toBe(expected);
  });
});

describe("formatGamesBehind", () => {
  it.each([
    [0, "–"],
    [1, "1"],
    [2.5, "2,5"],
    [10.5, "10,5"],
    [-1.5, "−1,5"],
    [-2, "−2"],
  ])("affiche %d sous la forme %s", (value, expected) => {
    expect(formatGamesBehind(value)).toBe(expected);
  });
});

describe("shortTeamName", () => {
  it.each([
    ["Atlanta Hawks", "Hawks"],
    ["Portland Trail Blazers", "Blazers"],
    ["LA Clippers", "Clippers"],
    ["Philadelphia 76ers", "76ers"],
    ["Heat", "Heat"],
  ])("raccourcit %s en %s", (name, expected) => {
    expect(shortTeamName(name)).toBe(expected);
  });
});
