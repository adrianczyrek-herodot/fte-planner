// Czysta logika wyznaczania konfliktu FTE — bez zależności od bazy/Next,
// dzięki czemu jest w pełni testowalna jednostkowo.

/** Maksymalna dostępność jednego pracownika w miesiącu (1.0 = 100% etatu). */
export const FTE_CAPACITY = 1;

// Pole fte to Decimal(4,2), więc operujemy na setnych w domenie liczb
// całkowitych — unika to błędów zmiennoprzecinkowych przy sumowaniu
// (np. 0.1 + 0.2 !== 0.3 w IEEE 754).
function toHundredths(fte: number): number {
  return Math.round(fte * 100);
}

/** Suma wartości FTE, odporna na błędy zaokrągleń floata. */
export function sumFte(ftes: number[]): number {
  const totalHundredths = ftes.reduce((acc, fte) => acc + toHundredths(fte), 0);
  return totalHundredths / 100;
}

/** Konflikt = suma FTE pracownika w miesiącu przekracza 100% (ostro > 1.0). */
export function isOverAllocated(totalFte: number): boolean {
  return toHundredths(totalFte) > toHundredths(FTE_CAPACITY);
}

export type AssignmentFte = { id: string; fte: number };

/**
 * Konflikt jest cechą całej grupy (pracownik + miesiąc): jeśli łączna suma
 * przekracza 1.0, WSZYSTKIE przydziały w grupie są oznaczane jako konfliktowe
 * (a nie tylko ostatnio dodany). Zwraca mapę id → isConflict, gotową do
 * zapisania na każdym rekordzie.
 */
export function computeConflictFlags(
  assignments: AssignmentFte[]
): Map<string, boolean> {
  const total = sumFte(assignments.map((a) => a.fte));
  const conflict = isOverAllocated(total);
  return new Map(assignments.map((a) => [a.id, conflict]));
}
