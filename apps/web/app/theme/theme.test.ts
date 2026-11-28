import { describe, expect, it } from "vitest";

import { parseTheme, themeAttribute } from "./theme";

describe("parseTheme", () => {
  it.each(["system", "light", "dark"] as const)("garde la valeur valide %s", (value) => {
    expect(parseTheme(value)).toBe(value);
  });

  it("retombe sur system quand le cookie est absent", () => {
    expect(parseTheme(undefined)).toBe("system");
  });

  it("retombe sur system quand le cookie est vide", () => {
    expect(parseTheme("")).toBe("system");
  });

  it.each(["blue", " dark", "dark ", "null", "undefined"])(
    "retombe sur system pour la valeur invalide %j",
    (value) => {
      expect(parseTheme(value)).toBe("system");
    },
  );

  it.each(["DARK", "Light", "System"])(
    "est sensible à la casse : %s retombe sur system",
    (value) => {
      expect(parseTheme(value)).toBe("system");
    },
  );
});

describe("themeAttribute", () => {
  it("ne pose pas d'attribut pour system", () => {
    expect(themeAttribute("system")).toBeUndefined();
  });

  it.each(["light", "dark"] as const)("pose data-theme=%s", (theme) => {
    expect(themeAttribute(theme)).toBe(theme);
  });
});
