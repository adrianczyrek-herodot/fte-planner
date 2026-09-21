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

export type RolePeriod = {
  startMonth: string;
  endMonth: string;
  requiredFte: number;
  /** Ilu ludzi ma obsadzić rolę. null = nie zadeklarowano. */
  requiredPeople?: number | null;
};

/** Obsada liczona w głowach, niezależnie od sumy FTE. */
export type PeopleCoverage = {
  required: number | null;
  assigned: number;
  status: "unset" | "fewer" | "exact" | "more";
};

/**
 * Ile osób stoi na roli. Liczymy unikalne osoby w całym okresie roli, nie w
 * każdym miesiącu osobno — pytanie „ilu ludzi mamy na tej roli" dotyczy składu
 * zespołu, a nie obsady konkretnego miesiąca (tę pokazuje pokrycie FTE).
 */
export function peopleCoverage(
  requiredPeople: number | null | undefined,
  assignments: { userId: string }[]
): PeopleCoverage {
  const assigned = new Set(assignments.map((a) => a.userId)).size;

  if (requiredPeople == null) {
    return { required: null, assigned, status: "unset" };
  }
  return {
    required: requiredPeople,
    assigned,
    status:
      assigned < requiredPeople ? "fewer" : assigned > requiredPeople ? "more" : "exact",
  };
}

export type CoverageMonth = {
  month: string;
  required: number;
  assigned: number;
  /** Ile FTE brakuje do zapotrzebowania (0, gdy pokryte lub z nadmiarem). */
  gap: number;
  /** Ile FTE obsady jest nad zapotrzebowaniem (0, gdy pokryte lub z luką). */
  surplus: number;
};

/** Niedobór ma pierwszeństwo — to jedyny stan, który wymaga działania. */
export type CoverageStatus = "gap" | "exact" | "surplus";

export type RoleCoverageSummary = {
  months: CoverageMonth[];
  /** Suma FTE zapotrzebowania po wszystkich miesiącach roli. */
  requiredTotal: number;
  /** Suma FTE faktycznej obsady po wszystkich miesiącach roli. */
  assignedTotal: number;
  /** Pokrycie w procentach (obsada / zapotrzebowanie), zaokrąglone do całości. */
  percent: number;
  status: CoverageStatus;
  hasGap: boolean;
  hasSurplus: boolean;
};

/** Zaokrąglenie do setnych — FTE to Decimal(4,2), więc dalej nie schodzimy. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Pokrycie roli w każdym miesiącu jej okresu: ile wymagane, ile obsadzone,
 * ile brakuje (luka) i ile jest nad zapotrzebowanie (nadmiar). Obsada = suma
 * FTE przydziałów pokrywających miesiąc.
 */
export function roleCoverage(
  role: RolePeriod,
  assignments: PeriodFte[]
): CoverageMonth[] {
  return monthsBetween(role.startMonth, role.endMonth).map((month) => {
    const assigned = sumFte(
      assignments
        .filter((a) => monthsBetween(a.startMonth, a.endMonth).includes(month))
        .map((a) => a.fte)
    );
    return {
      month,
      required: role.requiredFte,
      assigned,
      gap: Math.max(0, round2(role.requiredFte - assigned)),
      surplus: Math.max(0, round2(assigned - role.requiredFte)),
    };
  });
}

/**
 * Zbiorcza odpowiedź na pytanie „czy ta rola jest pokryta i na ile procent".
 * Procent liczymy z sum po wszystkich miesiącach roli, a nie ze średniej
 * miesięcznych procentów — inaczej miesiąc bez obsady ważyłby tyle samo co
 * miesiąc obsadzony podwójnie.
 */
export function roleCoverageSummary(
  role: RolePeriod,
  assignments: PeriodFte[]
): RoleCoverageSummary {
  const months = roleCoverage(role, assignments);
  const requiredTotal = sumFte(months.map((m) => m.required));
  const assignedTotal = sumFte(months.map((m) => m.assigned));
  const hasGap = months.some((m) => m.gap > 0);
  const hasSurplus = months.some((m) => m.surplus > 0);

  return {
    months,
    requiredTotal,
    assignedTotal,
    // Rola bez zapotrzebowania nie powstanie (walidacja wymaga FTE > 0), ale
    // dzielenie przez zero i tak nie może wyprodukować NaN w interfejsie.
    percent: requiredTotal === 0 ? 0 : Math.round((assignedTotal / requiredTotal) * 100),
    status: hasGap ? "gap" : hasSurplus ? "surplus" : "exact",
    hasGap,
    hasSurplus,
  };
}

export type WorkloadRow = {
  id: string;
  startMonth: string;
  endMonth: string;
  fte: number;
};

export type WorkloadMonth = {
  month: string;
  total: number;
  isOverloaded: boolean;
};

/**
 * Obłożenie jednej osoby miesiąc po miesiącu w podanym zakresie. Zakres jest
 * podawany z zewnątrz (a nie wyliczany z przydziałów), żeby oś czasu na karcie
 * pracownika obejmowała też miesiące bez zaangażowania — dziura w obłożeniu
 * jest tak samo istotną informacją jak przeciążenie.
 */
export function employeeWorkload(
  months: string[],
  assignments: WorkloadRow[]
): WorkloadMonth[] {
  return months.map((month) => {
    const total = sumFte(
      assignments
        .filter((a) => monthsBetween(a.startMonth, a.endMonth).includes(month))
        .map((a) => a.fte)
    );
    return { month, total, isOverloaded: isOverAllocated(total) };
  });
}

/** FTE jednego przydziału w danym miesiącu (0, gdy go nie pokrywa). */
export function assignmentFteInMonth(a: WorkloadRow, month: string): number {
  return monthsBetween(a.startMonth, a.endMonth).includes(month) ? a.fte : 0;
}

/** Czy rola ma w którymkolwiek miesiącu niedobór obsady. */
export function roleHasGap(role: RolePeriod, assignments: PeriodFte[]): boolean {
  return roleCoverage(role, assignments).some((c) => c.gap > 0);
}

/** Czy rola jest w którymkolwiek miesiącu obsadzona nad zapotrzebowanie. */
export function roleHasSurplus(role: RolePeriod, assignments: PeriodFte[]): boolean {
  return roleCoverage(role, assignments).some((c) => c.surplus > 0);
}
