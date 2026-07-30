import { describe, expect, it } from "vitest";

import {
  computeAssignmentConflicts,
  monthsBetween,
  roleCoverage,
  roleHasGap,
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
});
