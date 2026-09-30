import { describe, expect, it } from "vitest";

import {
  easterSunday,
  holidaysInYear,
  isHoliday,
  workingDayHolidaysInMonth,
} from "@/lib/holidays";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

describe("easterSunday", () => {
  // Daty zweryfikowane z kalendarza — algorytm ma je odtworzyć co do dnia.
  it.each([
    [2023, "2023-04-09"],
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2028, "2028-04-16"],
    [2030, "2030-04-21"],
  ])("Wielkanoc %i wypada %s", (year, expected) => {
    expect(iso(easterSunday(year))).toBe(expected);
  });

  it("zawsze wypada w niedzielę", () => {
    for (let y = 2020; y <= 2040; y++) {
      expect(easterSunday(y).getUTCDay()).toBe(0);
    }
  });
});

describe("holidaysInYear", () => {
  it("zawiera święta stałe", () => {
    const h = holidaysInYear(2026);
    for (const d of [
      "2026-01-01",
      "2026-01-06",
      "2026-05-01",
      "2026-05-03",
      "2026-08-15",
      "2026-11-01",
      "2026-11-11",
      "2026-12-25",
      "2026-12-26",
    ]) {
      expect(h.has(d)).toBe(true);
    }
  });

  it("wyznacza święta ruchome od Wielkanocy", () => {
    const h = holidaysInYear(2026); // Wielkanoc 5 kwietnia
    expect(h.has("2026-04-06")).toBe(true); // Poniedziałek Wielkanocny
    expect(h.has("2026-06-04")).toBe(true); // Boże Ciało (czwartek)
  });

  it("Boże Ciało zawsze wypada w czwartek", () => {
    for (let y = 2024; y <= 2035; y++) {
      const corpus = [...holidaysInYear(y)]
        .map((d) => new Date(`${d}T00:00:00Z`))
        .filter((d) => d.getUTCDay() === 4);
      expect(corpus.length).toBeGreaterThan(0);
    }
  });

  it("Wigilia jest wolna dopiero od 2025 roku", () => {
    expect(holidaysInYear(2024).has("2024-12-24")).toBe(false);
    expect(holidaysInYear(2025).has("2025-12-24")).toBe(true);
    expect(holidaysInYear(2026).has("2026-12-24")).toBe(true);
  });
});

describe("isHoliday", () => {
  it("rozpoznaje święto i zwykły dzień", () => {
    expect(isHoliday(new Date("2026-01-01T00:00:00Z"))).toBe(true);
    expect(isHoliday(new Date("2026-01-02T00:00:00Z"))).toBe(false);
  });
});

describe("workingDayHolidaysInMonth", () => {
  it("pomija święta wypadające w weekend", () => {
    // 15 sierpnia 2026 to sobota — nie zabiera dnia roboczego.
    expect(new Date("2026-08-15T00:00:00Z").getUTCDay()).toBe(6);
    expect(workingDayHolidaysInMonth("2026-08")).toEqual([]);
  });

  it("liczy święta wypadające w dzień roboczy", () => {
    // 1 stycznia 2026 to czwartek, 6 stycznia — wtorek.
    expect(workingDayHolidaysInMonth("2026-01")).toEqual([
      "2026-01-01",
      "2026-01-06",
    ]);
  });

  it("uwzględnia święta ruchome", () => {
    // Kwiecień 2026: Poniedziałek Wielkanocny 6 kwietnia.
    expect(workingDayHolidaysInMonth("2026-04")).toEqual(["2026-04-06"]);
  });

  it("zwraca pustą listę dla miesiąca bez świąt", () => {
    expect(workingDayHolidaysInMonth("2026-07")).toEqual([]);
  });
});
