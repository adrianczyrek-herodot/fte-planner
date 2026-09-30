import { describe, expect, it } from "vitest";

import { parseYmd, ymd } from "@/lib/timeline";
import {
  clampToMonth,
  fteShareInMonth,
  isWorkingDay,
  monthBounds,
  monthsCovered,
  workingDaysBetween,
  workingDaysCoveredInMonth,
} from "@/lib/period";

const d = parseYmd;

describe("isWorkingDay", () => {
  it("odrzuca weekendy", () => {
    // 11 i 12 lipca 2026 to sobota i niedziela.
    expect(isWorkingDay(d("2026-07-11"))).toBe(false);
    expect(isWorkingDay(d("2026-07-12"))).toBe(false);
    expect(isWorkingDay(d("2026-07-13"))).toBe(true);
  });

  it("odrzuca dni ustawowo wolne wypadające w tygodniu", () => {
    expect(isWorkingDay(d("2026-01-01"))).toBe(false); // Nowy Rok, czwartek
    expect(isWorkingDay(d("2026-06-04"))).toBe(false); // Boże Ciało, czwartek
    expect(isWorkingDay(d("2026-06-05"))).toBe(true);
  });
});

describe("workingDaysBetween", () => {
  it("liczy włącznie z oboma końcami", () => {
    // 13-17 lipca 2026 to pełny tydzień roboczy.
    expect(workingDaysBetween(d("2026-07-13"), d("2026-07-17"))).toBe(5);
  });

  it("pojedynczy dzień roboczy to 1, weekendowy to 0", () => {
    expect(workingDaysBetween(d("2026-07-13"), d("2026-07-13"))).toBe(1);
    expect(workingDaysBetween(d("2026-07-11"), d("2026-07-11"))).toBe(0);
  });

  it("odwrócony zakres to zero, a nie liczba ujemna", () => {
    expect(workingDaysBetween(d("2026-07-20"), d("2026-07-10"))).toBe(0);
  });
});

describe("monthBounds", () => {
  it("zwraca pierwszy i ostatni dzień, także w lutym roku przestępnego", () => {
    expect(ymd(monthBounds("2026-02").last)).toBe("2026-02-28");
    expect(ymd(monthBounds("2028-02").last)).toBe("2028-02-29");
    expect(ymd(monthBounds("2026-07").first)).toBe("2026-07-01");
  });
});

describe("monthsCovered", () => {
  it("wymienia miesiące dotknięte zakresem, także przez granicę roku", () => {
    expect(monthsCovered(d("2026-11-20"), d("2027-01-05"))).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
  });

  it("zakres w jednym miesiącu daje jeden miesiąc", () => {
    expect(monthsCovered(d("2026-07-05"), d("2026-07-06"))).toEqual(["2026-07"]);
  });

  it("odwrócony zakres nie zwraca niczego", () => {
    expect(monthsCovered(d("2026-07-20"), d("2026-07-10"))).toEqual([]);
  });
});

describe("clampToMonth", () => {
  it("przycina zakres do granic miesiąca", () => {
    const part = clampToMonth(d("2026-06-20"), d("2026-08-10"), "2026-07");
    expect(ymd(part!.from)).toBe("2026-07-01");
    expect(ymd(part!.to)).toBe("2026-07-31");
  });

  it("zwraca null dla miesiąca poza zakresem", () => {
    expect(clampToMonth(d("2026-07-01"), d("2026-07-31"), "2026-09")).toBeNull();
  });
});

describe("workingDaysCoveredInMonth", () => {
  it("pełny miesiąc to wszystkie jego dni robocze", () => {
    expect(workingDaysCoveredInMonth(d("2026-07-01"), d("2026-07-31"), "2026-07")).toBe(23);
  });

  it("część miesiąca to tylko dni robocze tej części", () => {
    expect(workingDaysCoveredInMonth(d("2026-07-12"), d("2026-07-26"), "2026-07")).toBe(10);
  });

  it("miesiąc spoza zakresu to zero", () => {
    expect(workingDaysCoveredInMonth(d("2026-07-01"), d("2026-07-31"), "2026-08")).toBe(0);
  });
});

describe("fteShareInMonth", () => {
  it("pełny miesiąc daje dokładnie tyle, ile wynosi FTE", () => {
    expect(fteShareInMonth(0.7, d("2026-07-01"), d("2026-07-31"), "2026-07")).toBe(0.7);
  });

  it("połowa miesiąca daje mniej więcej połowę etatu", () => {
    // 1-15 lipca to 11 z 23 dni roboczych.
    expect(fteShareInMonth(1, d("2026-07-01"), d("2026-07-15"), "2026-07")).toBe(0.48);
  });

  it("miesiąc nieobjęty zakresem daje zero", () => {
    expect(fteShareInMonth(1, d("2026-07-01"), d("2026-07-31"), "2026-09")).toBe(0);
  });

  it("suma udziałów po miesiącach nie przekracza długości zaangażowania", () => {
    const start = d("2026-07-15");
    const end = d("2026-09-15");
    const suma = monthsCovered(start, end).reduce(
      (acc, m) => acc + fteShareInMonth(1, start, end, m),
      0
    );
    expect(suma).toBeGreaterThan(1.5);
    expect(suma).toBeLessThan(2.5);
  });
});
