import { describe, expect, it } from "vitest";

import { pluralize, polishPlural } from "./plural";

describe("polishPlural", () => {
  const osoby = (n: number) => polishPlural(n, "osoba", "osoby", "osób");

  it("1 → forma pojedyncza", () => {
    expect(osoby(1)).toBe("osoba");
  });

  it("2–4 i 22–24 → forma „kilka”", () => {
    expect([2, 3, 4, 22, 33, 104].map(osoby)).toEqual(Array(6).fill("osoby"));
  });

  it("0, 5–21 i 12–14 w każdej setce → forma „wiele”", () => {
    expect([0, 5, 11, 12, 13, 14, 21, 112].map(osoby)).toEqual(Array(8).fill("osób"));
  });

  it("pluralize składa liczbę z formą", () => {
    expect(pluralize(2, "rola", "role", "ról")).toBe("2 role");
    expect(pluralize(5, "rola", "role", "ról")).toBe("5 ról");
  });
});
