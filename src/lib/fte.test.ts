import { describe, expect, it } from "vitest";

import {
  computeConflictFlags,
  isOverAllocated,
  sumFte,
  type AssignmentFte,
} from "./fte";

describe("sumFte", () => {
  it("sumuje wartości bez błędów zmiennoprzecinkowych", () => {
    expect(sumFte([0.1, 0.2])).toBe(0.3);
    expect(sumFte([0.7, 0.7])).toBe(1.4);
    expect(sumFte([])).toBe(0);
  });
});

describe("isOverAllocated", () => {
  it("nie zgłasza konfliktu przy sumie <= 1.0", () => {
    expect(isOverAllocated(0.5)).toBe(false);
    expect(isOverAllocated(1.0)).toBe(false); // dokładnie 100% to jeszcze nie konflikt
    expect(isOverAllocated(sumFte([0.3, 0.7]))).toBe(false);
  });

  it("zgłasza konflikt przy sumie > 1.0", () => {
    expect(isOverAllocated(1.01)).toBe(true);
    expect(isOverAllocated(sumFte([0.34, 0.33, 0.34]))).toBe(true); // 1.01
  });
});

describe("computeConflictFlags", () => {
  it("scenariusz 1: normalny przydział — brak konfliktu", () => {
    const assignments: AssignmentFte[] = [{ id: "a", fte: 0.5 }];
    const flags = computeConflictFlags(assignments);
    expect(flags.get("a")).toBe(false);
  });

  it("scenariusz 2: dwa przydziały po 0.7 w tym samym miesiącu — konflikt na obu (zapis niezablokowany)", () => {
    const assignments: AssignmentFte[] = [
      { id: "a", fte: 0.7 },
      { id: "b", fte: 0.7 },
    ];
    const flags = computeConflictFlags(assignments);
    // Łącznie 1.4 > 1.0 → oba przydziały oznaczone jako konfliktowe.
    expect(flags.get("a")).toBe(true);
    expect(flags.get("b")).toBe(true);
  });

  it("scenariusz 3: edycja przydziału zmienia status konfliktu w obie strony", () => {
    // Start: 0.7 + 0.7 = 1.4 → konflikt.
    let group: AssignmentFte[] = [
      { id: "a", fte: 0.7 },
      { id: "b", fte: 0.7 },
    ];
    expect(computeConflictFlags(group).get("a")).toBe(true);

    // Edycja b: 0.7 → 0.2, suma 0.9 → konflikt znika dla całej grupy.
    group = group.map((a) => (a.id === "b" ? { ...a, fte: 0.2 } : a));
    let flags = computeConflictFlags(group);
    expect(flags.get("a")).toBe(false);
    expect(flags.get("b")).toBe(false);

    // Ponowna edycja b: 0.2 → 0.5, suma 1.2 → konflikt wraca.
    group = group.map((a) => (a.id === "b" ? { ...a, fte: 0.5 } : a));
    flags = computeConflictFlags(group);
    expect(flags.get("a")).toBe(true);
    expect(flags.get("b")).toBe(true);
  });
});
