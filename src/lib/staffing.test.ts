import { describe, expect, it } from "vitest";

import {
  assignmentFteInMonth,
  computeAssignmentConflicts,
  employeeWorkload,
  monthsBetween,
  peopleCoverage,
  roleCoverage,
  roleCoverageSummary,
  roleHasGap,
  roleHasSurplus,
  type PeriodFte,
} from "./staffing";

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
  it("konflikt tylko w nakładających się miesiącach (>1.0)", () => {
    const a: PeriodFte[] = [
      { id: "x", startMonth: "2026-07", endMonth: "2026-09", fte: 0.7 },
      { id: "y", startMonth: "2026-08", endMonth: "2026-08", fte: 0.5 }, // 08: 1.2
    ];
    const flags = computeAssignmentConflicts(a);
    // x pokrywa 08 (przeciążony) → konflikt; y też (jest w 08)
    expect(flags.get("x")).toBe(true);
    expect(flags.get("y")).toBe(true);
  });

  it("brak konfliktu, gdy żaden miesiąc nie przekracza 1.0", () => {
    const a: PeriodFte[] = [
      { id: "x", startMonth: "2026-07", endMonth: "2026-07", fte: 0.6 },
      { id: "y", startMonth: "2026-07", endMonth: "2026-07", fte: 0.4 }, // 1.0
    ];
    const flags = computeAssignmentConflicts(a);
    expect(flags.get("x")).toBe(false);
    expect(flags.get("y")).toBe(false);
  });
});

describe("roleCoverage / roleHasGap", () => {
  const role = { startMonth: "2026-07", endMonth: "2026-09", requiredFte: 1.0 };

  it("liczy obsadę i lukę per miesiąc", () => {
    const cov = roleCoverage(role, [
      { id: "a", startMonth: "2026-07", endMonth: "2026-08", fte: 0.6 },
    ]);
    expect(cov).toHaveLength(3);
    expect(cov[0]).toMatchObject({ month: "2026-07", assigned: 0.6, gap: 0.4 });
    expect(cov[2]).toMatchObject({ month: "2026-09", assigned: 0, gap: 1 });
  });

  it("rola w pełni obsadzona → brak luki", () => {
    const full = [
      { id: "a", startMonth: "2026-07", endMonth: "2026-09", fte: 0.6 },
      { id: "b", startMonth: "2026-07", endMonth: "2026-09", fte: 0.4 },
    ];
    expect(roleHasGap(role, full)).toBe(false);
    expect(roleHasGap(role, full.slice(0, 1))).toBe(true);
  });

  it("wykrywa nadmiar obsady, nie tylko niedobór", () => {
    const over = [
      { id: "a", startMonth: "2026-07", endMonth: "2026-09", fte: 1 },
      { id: "b", startMonth: "2026-07", endMonth: "2026-09", fte: 0.5 },
    ];
    const cov = roleCoverage(role, over);
    expect(cov[0]).toMatchObject({ assigned: 1.5, gap: 0, surplus: 0.5 });
    expect(roleHasSurplus(role, over)).toBe(true);
    expect(roleHasGap(role, over)).toBe(false);
  });
});

describe("roleCoverageSummary", () => {
  const role = { startMonth: "2026-07", endMonth: "2026-09", requiredFte: 1.0 };

  it("liczy procent z sum, nie ze średniej miesięcy", () => {
    // 0.6 w dwóch miesiącach z trzech → 1.2 z 3.0 = 40%.
    const s = roleCoverageSummary(role, [
      { id: "a", startMonth: "2026-07", endMonth: "2026-08", fte: 0.6 },
    ]);
    expect(s.requiredTotal).toBe(3);
    expect(s.assignedTotal).toBe(1.2);
    expect(s.percent).toBe(40);
    expect(s.status).toBe("gap");
  });

  it("przypadek ze spotkania: 1.5 z 2.0 FTE to 75%", () => {
    const twoFte = { startMonth: "2026-07", endMonth: "2026-07", requiredFte: 2.0 };
    const s = roleCoverageSummary(twoFte, [
      { id: "a", startMonth: "2026-07", endMonth: "2026-07", fte: 1 },
      { id: "b", startMonth: "2026-07", endMonth: "2026-07", fte: 0.5 },
    ]);
    expect(s.percent).toBe(75);
    expect(s.status).toBe("gap");
  });

  it("dokładne pokrycie → status exact i 100%", () => {
    const s = roleCoverageSummary(role, [
      { id: "a", startMonth: "2026-07", endMonth: "2026-09", fte: 1 },
    ]);
    expect(s.percent).toBe(100);
    expect(s.status).toBe("exact");
    expect(s.hasGap).toBe(false);
    expect(s.hasSurplus).toBe(false);
  });

  it("nadmiar → status surplus i procent powyżej 100", () => {
    const s = roleCoverageSummary(role, [
      { id: "a", startMonth: "2026-07", endMonth: "2026-09", fte: 1 },
      { id: "b", startMonth: "2026-07", endMonth: "2026-09", fte: 0.5 },
    ]);
    expect(s.percent).toBe(150);
    expect(s.status).toBe("surplus");
    expect(s.hasSurplus).toBe(true);
  });

  it("niedobór w jednym miesiącu wygrywa z nadmiarem w innym", () => {
    const s = roleCoverageSummary(role, [
      // 07: 1.5 (nadmiar), 08: 1.5 (nadmiar), 09: 0 (niedobór)
      { id: "a", startMonth: "2026-07", endMonth: "2026-08", fte: 1 },
      { id: "b", startMonth: "2026-07", endMonth: "2026-08", fte: 0.5 },
    ]);
    expect(s.hasGap).toBe(true);
    expect(s.hasSurplus).toBe(true);
    expect(s.status).toBe("gap");
    // 3.0 obsady z 3.0 zapotrzebowania — 100% mimo dziury w ostatnim miesiącu,
    // dlatego sam procent nigdy nie zastąpi statusu.
    expect(s.percent).toBe(100);
  });
});

describe("peopleCoverage", () => {
  it("bez zadeklarowanej liczby osób tylko zlicza obsadę", () => {
    const c = peopleCoverage(null, [{ userId: "a" }, { userId: "b" }]);
    expect(c).toEqual({ required: null, assigned: 2, status: "unset" });
  });

  it("liczy unikalne osoby, nie przydziały", () => {
    // Jedna osoba na dwóch okresach tej samej roli to nadal jedna głowa.
    const c = peopleCoverage(2, [{ userId: "a" }, { userId: "a" }]);
    expect(c.assigned).toBe(1);
    expect(c.status).toBe("fewer");
  });

  it("rozróżnia niedobór, zgodność i nadmiar głów", () => {
    expect(peopleCoverage(2, [{ userId: "a" }]).status).toBe("fewer");
    expect(peopleCoverage(2, [{ userId: "a" }, { userId: "b" }]).status).toBe("exact");
    expect(
      peopleCoverage(2, [{ userId: "a" }, { userId: "b" }, { userId: "c" }]).status
    ).toBe("more");
  });

  it("2.0 FTE obsadzone czterema połówkami to nadmiar głów, choć FTE się zgadza", () => {
    const half = [{ userId: "a" }, { userId: "b" }, { userId: "c" }, { userId: "d" }];
    expect(peopleCoverage(2, half)).toMatchObject({ assigned: 4, status: "more" });
  });
});

describe("employeeWorkload", () => {
  const przydzialy = [
    { id: "a", startMonth: "2026-07", endMonth: "2026-10", fte: 0.7 },
    { id: "b", startMonth: "2026-08", endMonth: "2026-10", fte: 0.5 },
  ];

  it("sumuje FTE per miesiąc i oznacza przeciążenie", () => {
    const w = employeeWorkload(["2026-07", "2026-08", "2026-09"], przydzialy);
    expect(w[0]).toEqual({ month: "2026-07", total: 0.7, isOverloaded: false });
    expect(w[1]).toEqual({ month: "2026-08", total: 1.2, isOverloaded: true });
    expect(w[2]).toEqual({ month: "2026-09", total: 1.2, isOverloaded: true });
  });

  it("pokazuje miesiące bez zaangażowania jako zero, nie pomija ich", () => {
    const w = employeeWorkload(["2026-05", "2026-06", "2026-07"], przydzialy);
    expect(w.map((m) => m.total)).toEqual([0, 0, 0.7]);
    expect(w).toHaveLength(3);
  });

  it("dokładnie 1.0 nie jest przeciążeniem", () => {
    const w = employeeWorkload(["2026-07"], [
      { id: "a", startMonth: "2026-07", endMonth: "2026-07", fte: 0.4 },
      { id: "b", startMonth: "2026-07", endMonth: "2026-07", fte: 0.6 },
    ]);
    expect(w[0]).toEqual({ month: "2026-07", total: 1, isOverloaded: false });
  });
});

describe("assignmentFteInMonth", () => {
  const a = { id: "a", startMonth: "2026-08", endMonth: "2026-09", fte: 0.5 };

  it("zwraca FTE w pokrytym miesiącu i zero poza okresem", () => {
    expect(assignmentFteInMonth(a, "2026-08")).toBe(0.5);
    expect(assignmentFteInMonth(a, "2026-09")).toBe(0.5);
    expect(assignmentFteInMonth(a, "2026-07")).toBe(0);
    expect(assignmentFteInMonth(a, "2026-10")).toBe(0);
  });
});
