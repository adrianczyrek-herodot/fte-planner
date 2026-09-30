import { describe, expect, it } from "vitest";

import { parseYmd } from "@/lib/timeline";
import {
  assignmentFteInMonth,
  computeAssignmentConflicts,
  employeeWorkload,
  monthsBetween,
  peakDailyFte,
  peopleCoverage,
  roleCoverage,
  roleCoverageSummary,
  roleHasGap,
  roleHasSurplus,
  type PeriodFte,
} from "./staffing";

/** Skrót na datę — testy czyta się wtedy jak zakresy, a nie jak wywołania. */
const d = parseYmd;

/**
 * Pełny miesiąc jako zakres dzienny. Większość testów pokrycia dotyczy całych
 * miesięcy, więc udział w miesiącu równa się wtedy dokładnie FTE i liczby
 * pozostają takie same jak przed przejściem na dni.
 */
function whole(month: string): { startDate: Date; endDate: Date } {
  const [y, m] = month.split("-").map(Number);
  return {
    startDate: new Date(Date.UTC(y, m - 1, 1)),
    endDate: new Date(Date.UTC(y, m, 0)),
  };
}

describe("monthsBetween", () => {
  it("rozwija zakres włącznie i przez granicę roku", () => {
    expect(monthsBetween("2026-07", "2026-09")).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(monthsBetween("2026-11", "2027-01")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
    expect(monthsBetween("2026-05", "2026-05")).toEqual(["2026-05"]);
  });
});

describe("computeAssignmentConflicts", () => {
  it("konflikt tylko w nakładających się dniach (>1.0)", () => {
    const a: PeriodFte[] = [
      { id: "x", ...whole("2026-07"), fte: 0.7 },
      { id: "y", ...whole("2026-07"), fte: 0.5 }, // razem 1.2
    ];
    const flags = computeAssignmentConflicts(a);
    expect(flags.get("x")).toBe(true);
    expect(flags.get("y")).toBe(true);
  });

  it("brak konfliktu, gdy żaden dzień nie przekracza 1.0", () => {
    const a: PeriodFte[] = [
      { id: "x", ...whole("2026-07"), fte: 0.6 },
      { id: "y", ...whole("2026-07"), fte: 0.4 }, // dokładnie 1.0
    ];
    const flags = computeAssignmentConflicts(a);
    expect(flags.get("x")).toBe(false);
    expect(flags.get("y")).toBe(false);
  });

  it("przydziały w tym samym miesiącu, ale nienachodzące na siebie, nie kolidują", () => {
    // To jest cały zysk z przejścia na dni: przy granulacji miesięcznej suma
    // wynosiłaby 1.3 i lipiec fałszywie świeciłby na czerwono.
    const a: PeriodFte[] = [
      { id: "x", startDate: d("2026-07-01"), endDate: d("2026-07-10"), fte: 0.7 },
      { id: "y", startDate: d("2026-07-20"), endDate: d("2026-07-31"), fte: 0.6 },
    ];
    const flags = computeAssignmentConflicts(a);
    expect(flags.get("x")).toBe(false);
    expect(flags.get("y")).toBe(false);
  });

  it("nakładanie wyłącznie w weekend nie jest konfliktem", () => {
    // 11 i 12 lipca 2026 to sobota i niedziela — nikt wtedy nie pracuje, więc
    // dwa przydziały stykające się przez weekend nie są przeciążeniem.
    const a: PeriodFte[] = [
      { id: "x", startDate: d("2026-07-01"), endDate: d("2026-07-12"), fte: 0.7 },
      { id: "y", startDate: d("2026-07-11"), endDate: d("2026-07-24"), fte: 0.6 },
    ];
    const flags = computeAssignmentConflicts(a);
    expect(flags.get("x")).toBe(false);
    expect(flags.get("y")).toBe(false);
  });

  it("pojedynczy przydział powyżej 1.0 też jest konfliktem", () => {
    const flags = computeAssignmentConflicts([
      { id: "x", ...whole("2026-07"), fte: 1.5 },
    ]);
    expect(flags.get("x")).toBe(true);
  });

  it("brak przydziałów nie wywraca się na pustym zakresie", () => {
    expect(computeAssignmentConflicts([]).size).toBe(0);
  });
});

describe("peakDailyFte", () => {
  it("bierze najwyższy dzień, nie średnią okresu", () => {
    const peak = peakDailyFte(
      [
        { startDate: d("2026-07-01"), endDate: d("2026-07-31"), fte: 0.5 },
        { startDate: d("2026-07-06"), endDate: d("2026-07-10"), fte: 0.8 },
      ],
      d("2026-07-01"),
      d("2026-07-31")
    );
    expect(peak).toBe(1.3);
  });
});

describe("roleCoverage / roleHasGap", () => {
  const role = { ...whole("2026-07"), requiredFte: 1.0 };
  const roleQ = {
    startDate: d("2026-07-01"),
    endDate: d("2026-09-30"),
    requiredFte: 1.0,
  };

  it("liczy obsadę i lukę per miesiąc", () => {
    const cov = roleCoverage(roleQ, [
      { id: "a", startDate: d("2026-07-01"), endDate: d("2026-08-31"), fte: 0.6 },
    ]);
    expect(cov.map((c) => c.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(cov[0].assigned).toBe(0.6);
    expect(cov[0].gap).toBe(0.4);
    expect(cov[2].assigned).toBe(0);
    expect(cov[2].gap).toBe(1);
    expect(roleHasGap(roleQ, [])).toBe(true);
  });

  it("rola w pełni obsadzona → brak luki", () => {
    const assignments = [{ id: "a", ...whole("2026-07"), fte: 1.0 }];
    expect(roleHasGap(role, assignments)).toBe(false);
    expect(roleHasSurplus(role, assignments)).toBe(false);
  });

  it("wykrywa nadmiar obsady, nie tylko niedobór", () => {
    const assignments = [
      { id: "a", ...whole("2026-07"), fte: 0.8 },
      { id: "b", ...whole("2026-07"), fte: 0.5 },
    ];
    expect(roleHasSurplus(role, assignments)).toBe(true);
    expect(roleHasGap(role, assignments)).toBe(false);
  });

  it("obsada na część miesiąca pokrywa rolę tylko proporcjonalnie", () => {
    // 1-15 lipca to 11 z 23 dni roboczych, czyli 0.48 etatu w skali lipca.
    const cov = roleCoverage(role, [
      { id: "a", startDate: d("2026-07-01"), endDate: d("2026-07-15"), fte: 1.0 },
    ]);
    expect(cov[0].assigned).toBe(0.48);
    expect(cov[0].gap).toBe(0.52);
  });
});

describe("roleCoverageSummary", () => {
  const roleQ = {
    startDate: d("2026-07-01"),
    endDate: d("2026-09-30"),
    requiredFte: 1.0,
  };

  it("liczy procent z sum, nie ze średniej miesięcy", () => {
    const s = roleCoverageSummary(roleQ, [
      { id: "a", startDate: d("2026-07-01"), endDate: d("2026-08-31"), fte: 1.0 },
    ]);
    // 2.0 z 3.0 FTE = 67%, a nie średnia ze 100%, 100% i 0%.
    expect(s.requiredTotal).toBe(3);
    expect(s.assignedTotal).toBe(2);
    expect(s.percent).toBe(67);
    expect(s.status).toBe("gap");
  });

  it("przypadek ze spotkania: 1.5 z 2.0 FTE to 75%", () => {
    const role = {
      startDate: d("2026-07-01"),
      endDate: d("2026-08-31"),
      requiredFte: 1.0,
    };
    const s = roleCoverageSummary(role, [
      { id: "a", ...whole("2026-07"), fte: 1.0 },
      { id: "b", ...whole("2026-08"), fte: 0.5 },
    ]);
    expect(s.percent).toBe(75);
  });

  it("dokładne pokrycie → status exact i 100%", () => {
    const s = roleCoverageSummary(roleQ, [
      { id: "a", startDate: d("2026-07-01"), endDate: d("2026-09-30"), fte: 1.0 },
    ]);
    expect(s.percent).toBe(100);
    expect(s.status).toBe("exact");
  });

  it("nadmiar → status surplus i procent powyżej 100", () => {
    const s = roleCoverageSummary(roleQ, [
      { id: "a", startDate: d("2026-07-01"), endDate: d("2026-09-30"), fte: 1.0 },
      { id: "b", ...whole("2026-08"), fte: 0.5 },
    ]);
    expect(s.percent).toBeGreaterThan(100);
    expect(s.status).toBe("surplus");
  });

  it("niedobór w jednym miesiącu wygrywa z nadmiarem w innym", () => {
    const s = roleCoverageSummary(roleQ, [
      { id: "a", ...whole("2026-07"), fte: 2.0 },
      { id: "b", ...whole("2026-08"), fte: 1.0 },
    ]);
    // Wrzesień pusty → niedobór, mimo że w sumie jest nawet z nadmiarem.
    expect(s.hasGap).toBe(true);
    expect(s.status).toBe("gap");
  });
});

describe("peopleCoverage", () => {
  it("bez zadeklarowanej liczby osób tylko zlicza obsadę", () => {
    const c = peopleCoverage(null, [{ userId: "u1" }, { userId: "u2" }]);
    expect(c).toEqual({ required: null, assigned: 2, status: "unset" });
  });

  it("liczy unikalne osoby, nie przydziały", () => {
    const c = peopleCoverage(2, [
      { userId: "u1" },
      { userId: "u1" },
      { userId: "u2" },
    ]);
    expect(c.assigned).toBe(2);
    expect(c.status).toBe("exact");
  });

  it("rozróżnia niedobór, zgodność i nadmiar głów", () => {
    expect(peopleCoverage(3, [{ userId: "u1" }]).status).toBe("fewer");
    expect(peopleCoverage(1, [{ userId: "u1" }]).status).toBe("exact");
    expect(peopleCoverage(1, [{ userId: "u1" }, { userId: "u2" }]).status).toBe("more");
  });

  it("2.0 FTE obsadzone czterema połówkami to nadmiar głów, choć FTE się zgadza", () => {
    const c = peopleCoverage(2, ["a", "b", "c", "d"].map((userId) => ({ userId })));
    expect(c.status).toBe("more");
  });
});

describe("employeeWorkload", () => {
  const months = ["2026-07", "2026-08", "2026-09"];

  it("sumuje udziały per miesiąc i oznacza przeciążenie", () => {
    const w = employeeWorkload(months, [
      { id: "a", ...whole("2026-07"), fte: 0.7 },
      { id: "b", ...whole("2026-07"), fte: 0.5 },
    ]);
    expect(w[0].total).toBe(1.2);
    expect(w[0].isOverloaded).toBe(true);
    expect(w[1].total).toBe(0);
  });

  it("pokazuje miesiące bez zaangażowania jako zero, nie pomija ich", () => {
    const w = employeeWorkload(months, [{ id: "a", ...whole("2026-08"), fte: 1 }]);
    expect(w.map((m) => m.total)).toEqual([0, 1, 0]);
  });

  it("dokładnie 1.0 nie jest przeciążeniem", () => {
    const w = employeeWorkload(["2026-07"], [{ id: "a", ...whole("2026-07"), fte: 1 }]);
    expect(w[0].isOverloaded).toBe(false);
  });

  it("przeciążenie widać ze szczytu dziennego, choć miesięczny udział jest spokojny", () => {
    // Tydzień na 1.5 FTE to realny problem; uśredniony na cały lipiec wyglądałby
    // niewinnie i zniknąłby z oczu.
    const w = employeeWorkload(["2026-07"], [
      { id: "a", startDate: d("2026-07-06"), endDate: d("2026-07-10"), fte: 0.8 },
      { id: "b", startDate: d("2026-07-06"), endDate: d("2026-07-10"), fte: 0.7 },
    ]);
    expect(w[0].peak).toBe(1.5);
    expect(w[0].isOverloaded).toBe(true);
    expect(w[0].total).toBeLessThan(1);
  });
});

describe("assignmentFteInMonth", () => {
  it("zwraca udział w pokrytym miesiącu i zero poza okresem", () => {
    const a = { id: "a", ...whole("2026-08"), fte: 0.5 };
    expect(assignmentFteInMonth(a, "2026-08")).toBe(0.5);
    expect(assignmentFteInMonth(a, "2026-07")).toBe(0);
  });
});
