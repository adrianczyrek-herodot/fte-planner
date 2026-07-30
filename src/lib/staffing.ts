// Czysta logika staffingu (zapotrzebowanie na role + obsada w okresach).
// Bez zależności od bazy/Next — testowalna jednostkowo.
import { isOverAllocated, sumFte } from "@/lib/fte";

function ymToIndex(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
}

function indexToYm(index: number): string {
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Lista miesięcy "YYYY-MM" pokrytych zakresem [start, end] (włącznie). */
export function monthsBetween(start: string, end: string): string[] {
  const s = ymToIndex(start);
  const e = ymToIndex(end);
  if (e < s) return [start];
  const out: string[] = [];
  for (let i = s; i <= e; i++) out.push(indexToYm(i));
  return out;
}

export type PeriodFte = {
  id: string;
  startMonth: string;
  endMonth: string;
  fte: number;
};

/**
 * Dla WSZYSTKICH przydziałów jednego pracownika: przydział jest w konflikcie,
 * jeśli w którymkolwiek z pokrytych miesięcy jego łączne FTE > 1.0.
 * Zwraca mapę id → isConflict.
 */
export function computeAssignmentConflicts(
  assignments: PeriodFte[]
): Map<string, boolean> {
  // FTE per miesiąc (lista wartości, by użyć odpornej sumy).
  const perMonth = new Map<string, number[]>();
  for (const a of assignments) {
    for (const m of monthsBetween(a.startMonth, a.endMonth)) {
      const list = perMonth.get(m) ?? [];
      list.push(a.fte);
      perMonth.set(m, list);
    }
  }

  const monthOver = new Map<string, boolean>();
  for (const [m, ftes] of perMonth) {
    monthOver.set(m, isOverAllocated(sumFte(ftes)));
  }

  const result = new Map<string, boolean>();
  for (const a of assignments) {
    const conflict = monthsBetween(a.startMonth, a.endMonth).some(
      (m) => monthOver.get(m) === true
    );
    result.set(a.id, conflict);
  }
  return result;
}

/**
 * Pokrycie roli w każdym miesiącu jej okresu: ile wymagane, ile obsadzone,
 * ile brakuje (luka). Obsada = suma FTE przydziałów pokrywających miesiąc.
 */
export function roleCoverage(
  role: { startMonth: string; endMonth: string; requiredFte: number },
  assignments: PeriodFte[]
): { month: string; required: number; assigned: number; gap: number }[] {
  return monthsBetween(role.startMonth, role.endMonth).map((month) => {
    const assigned = sumFte(
      assignments
        .filter((a) => monthsBetween(a.startMonth, a.endMonth).includes(month))
        .map((a) => a.fte)
    );
    const gap = Math.max(0, Math.round((role.requiredFte - assigned) * 100) / 100);
    return { month, required: role.requiredFte, assigned, gap };
  });
}

/** Czy rola ma w którymkolwiek miesiącu niedobór obsady. */
export function roleHasGap(
  role: { startMonth: string; endMonth: string; requiredFte: number },
  assignments: PeriodFte[]
): boolean {
  return roleCoverage(role, assignments).some((c) => c.gap > 0);
}
