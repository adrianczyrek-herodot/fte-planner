// Czysta logika staffingu (zapotrzebowanie na role + obsada w okresach).
// Bez zależności od bazy/Next — testowalna jednostkowo.
//
// Okresy są dzienne, ale raportujemy w miesiącach, więc w tym pliku żyją obok
// siebie dwie miary i warto je rozróżniać:
//
//  * UDZIAŁ W MIESIĄCU (`fteShareInMonth`) — ile etatu przydział zajmuje w skali
//    całego miesiąca. 1.0 FTE przez połowę lipca to w lipcu 0.5. Tym liczymy
//    pokrycie roli, siatkę obłożenia i koszt, bo te pytania dotyczą sumy pracy.
//
//  * SZCZYT DZIENNY (`peak`) — najwyższa suma FTE w pojedynczym dniu roboczym.
//    Tym wykrywamy przeciążenie, bo człowiek przeciążony przez dwa tygodnie
//    jest przeciążony naprawdę, nawet jeśli po uśrednieniu na miesiąc wychodzi
//    spokojne 0.8.

import { isOverAllocated, sumFte } from "@/lib/fte";
import {
  fteShareInMonth,
  isWorkingDay,
  monthBounds,
  monthsCovered,
  workingDaysBetween,
} from "@/lib/period";
import { dateFromDayIndex, dayIndex } from "@/lib/timeline";

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
  startDate: Date;
  endDate: Date;
  fte: number;
};

/** Najwyższa suma FTE w pojedynczym dniu roboczym zakresu [from, to]. */
export function peakDailyFte(
  assignments: { startDate: Date; endDate: Date; fte: number }[],
  from: Date,
  to: Date
): number {
  const start = dayIndex(from);
  const end = dayIndex(to);
  const spans = assignments.map((a) => ({
    from: dayIndex(a.startDate),
    to: dayIndex(a.endDate),
    fte: a.fte,
  }));

  let peak = 0;
  for (let d = start; d <= end; d++) {
    // Weekendy i dni ustawowo wolne pomijamy — przydział kończący się w piątek
    // i kolejny zaczynający się w poniedziałek nie nachodzą na siebie w żadnym
    // dniu, w którym ktokolwiek pracuje.
    if (!isWorkingDay(dateFromDayIndex(d))) continue;

    const total = sumFte(
      spans.filter((s) => s.from <= d && d <= s.to).map((s) => s.fte)
    );
    if (total > peak) peak = total;
  }
  return peak;
}

/**
 * Dla WSZYSTKICH przydziałów jednego pracownika: przydział jest w konflikcie,
 * jeśli w którymkolwiek pokrytym DNIU ROBOCZYM jego łączne FTE przekracza 1.0.
 * Zwraca mapę id → isConflict.
 */
export function computeAssignmentConflicts(
  assignments: PeriodFte[]
): Map<string, boolean> {
  const result = new Map(assignments.map((a) => [a.id, false]));
  if (assignments.length === 0) return result;

  const spans = assignments.map((a) => ({
    id: a.id,
    from: dayIndex(a.startDate),
    to: dayIndex(a.endDate),
    fte: a.fte,
  }));

  const first = Math.min(...spans.map((s) => s.from));
  const last = Math.max(...spans.map((s) => s.to));

  for (let d = first; d <= last; d++) {
    if (!isWorkingDay(dateFromDayIndex(d))) continue;

    const covering = spans.filter((s) => s.from <= d && d <= s.to);
    if (!isOverAllocated(sumFte(covering.map((s) => s.fte)))) continue;

    // Konflikt jest cechą całej grupy nachodzącej na siebie tego dnia, a nie
    // tylko ostatnio dodanego przydziału.
    for (const s of covering) result.set(s.id, true);
  }

  return result;
}

export type RolePeriod = {
  startDate: Date;
  endDate: Date;
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
 * każdym dniu osobno — pytanie „ilu ludzi mamy na tej roli" dotyczy składu
 * zespołu, a nie obsady konkretnego dnia (tę pokazuje pokrycie FTE).
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
  /** Zapotrzebowanie jako udział w miesiącu (rola na pół miesiąca → połowa). */
  required: number;
  /** Obsada jako udział w miesiącu, liczona tylko z dni w okresie roli. */
  assigned: number;
  /** Największy dzienny brak obsady w tym miesiącu (0, gdy żadnego dnia nie brakuje). */
  gap: number;
  /** Największy dzienny nadmiar obsady w tym miesiącu (0, gdy żadnego dnia nie ma). */
  surplus: number;
  /** Ile dni roboczych roli w tym miesiącu ma za mało obsady. */
  gapDays: number;
  /** Ile dni roboczych roli w tym miesiącu ma obsadę ponad zapotrzebowanie. */
  surplusDays: number;
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
  /** Czy okres roli zawiera choć jeden dzień roboczy (rola na sam weekend — nie). */
  hasWorkingDays: boolean;
};

/** Zaokrąglenie do setnych — FTE to Decimal(4,2), więc dalej nie schodzimy. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Pokrycie roli w każdym miesiącu jej okresu.
 *
 * Wartości miesięczne (`required`, `assigned`) to udziały w miesiącu — rola
 * wymagająca 1.0 FTE przez pół marca potrzebuje w marcu 0.5. Liczymy je z sumy
 * FTE×dni i zaokrąglamy raz, na końcu: zaokrąglanie każdego przydziału osobno
 * potrafiło z ciągłej obsady trzema osobami zrobić „0.99 z 1".
 *
 * Niedobór i nadmiar oceniamy jednak DZIEŃ PO DNIU. Dwie osoby na pierwszą
 * połowę miesiąca dają w miesiącu tyle samo FTE co jedna na cały miesiąc, ale
 * w drugiej połowie roli nikt nie obsadza — i to musi być widać.
 *
 * Liczy się tylko część przydziału mieszcząca się w okresie roli: przydział
 * wystający poza rolę nie może sztucznie podbijać jej pokrycia.
 */
export function roleCoverage(
  role: RolePeriod,
  assignments: PeriodFte[]
): CoverageMonth[] {
  const roleFrom = dayIndex(role.startDate);
  const roleTo = dayIndex(role.endDate);
  const required100 = Math.round(role.requiredFte * 100);

  const spans = assignments
    .map((a) => ({
      from: Math.max(dayIndex(a.startDate), roleFrom),
      to: Math.min(dayIndex(a.endDate), roleTo),
      fte100: Math.round(a.fte * 100),
    }))
    .filter((s) => s.from <= s.to);

  return monthsCovered(role.startDate, role.endDate).map((month) => {
    const { first, last } = monthBounds(month);
    const monthWorkingDays = workingDaysBetween(first, last);
    const from = Math.max(roleFrom, dayIndex(first));
    const to = Math.min(roleTo, dayIndex(last));

    let roleDays = 0;
    let assignedFteDays100 = 0;
    let gapDays = 0;
    let surplusDays = 0;
    let maxShort100 = 0;
    let maxOver100 = 0;

    for (let d = from; d <= to; d++) {
      if (!isWorkingDay(dateFromDayIndex(d))) continue;
      roleDays++;

      let covered100 = 0;
      for (const s of spans) if (s.from <= d && d <= s.to) covered100 += s.fte100;
      assignedFteDays100 += covered100;

      if (covered100 < required100) {
        gapDays++;
        maxShort100 = Math.max(maxShort100, required100 - covered100);
      } else if (covered100 > required100) {
        surplusDays++;
        maxOver100 = Math.max(maxOver100, covered100 - required100);
      }
    }

    const share = (fteDays100: number) =>
      monthWorkingDays === 0 ? 0 : round2(fteDays100 / 100 / monthWorkingDays);

    return {
      month,
      required: share(required100 * roleDays),
      assigned: share(assignedFteDays100),
      gap: maxShort100 / 100,
      surplus: maxOver100 / 100,
      gapDays,
      surplusDays,
    };
  });
}

/**
 * Zbiorcza odpowiedź na pytanie „czy ta rola jest pokryta i na ile procent".
 * Procent liczymy z sum po wszystkich miesiącach roli, a nie ze średniej
 * miesięcznych procentów — inaczej miesiąc bez obsady ważyłby tyle samo co
 * miesiąc obsadzony podwójnie. Status wynika z oceny dziennej (patrz
 * `roleCoverage`), więc 100% z dziurą w części okresu to nadal niedobór.
 */
export function roleCoverageSummary(
  role: RolePeriod,
  assignments: PeriodFte[]
): RoleCoverageSummary {
  const months = roleCoverage(role, assignments);
  const requiredTotal = sumFte(months.map((m) => m.required));
  const assignedTotal = sumFte(months.map((m) => m.assigned));
  const hasGap = months.some((m) => m.gapDays > 0);
  const hasSurplus = months.some((m) => m.surplusDays > 0);
  const hasWorkingDays = months.some((m) => m.required > 0 || m.gapDays + m.surplusDays > 0);

  return {
    months,
    requiredTotal,
    assignedTotal,
    // Rola bez dni roboczych (np. na sam weekend) nie ma czego pokrywać —
    // dzielenie przez zero nie może wyprodukować NaN w interfejsie.
    percent: requiredTotal === 0 ? 0 : Math.round((assignedTotal / requiredTotal) * 100),
    status: hasGap ? "gap" : hasSurplus ? "surplus" : "exact",
    hasGap,
    hasSurplus,
    hasWorkingDays,
  };
}

export type WorkloadRow = {
  id: string;
  startDate: Date;
  endDate: Date;
  fte: number;
};

export type WorkloadMonth = {
  month: string;
  /** Udział w miesiącu: ile etatu zajmuje obsada w skali całego miesiąca. */
  total: number;
  /** Najwyższa suma FTE w pojedynczym dniu roboczym tego miesiąca. */
  peak: number;
  isOverloaded: boolean;
};

/**
 * Obłożenie jednej osoby miesiąc po miesiącu w podanym zakresie. Zakres jest
 * podawany z zewnątrz (a nie wyliczany z przydziałów), żeby oś czasu na karcie
 * pracownika obejmowała też miesiące bez zaangażowania — dziura w obłożeniu
 * jest tak samo istotną informacją jak przeciążenie.
 *
 * Przeciążenie bierze się ze szczytu dziennego, a nie z udziału miesięcznego:
 * dwa tygodnie na 1.5 FTE to realny problem, który po uśrednieniu na miesiąc
 * wyglądałby na 0.75 i zniknąłby z oczu.
 */
export function employeeWorkload(
  months: string[],
  assignments: WorkloadRow[]
): WorkloadMonth[] {
  return months.map((month) => {
    const [year, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(year, m - 1, 1));
    const last = new Date(Date.UTC(year, m, 0));

    const total =
      Math.round(
        assignments.reduce(
          (sum, a) => sum + fteShareInMonth(a.fte, a.startDate, a.endDate, month),
          0
        ) * 100
      ) / 100;
    const peak = peakDailyFte(assignments, first, last);

    return { month, total, peak, isOverloaded: isOverAllocated(peak) };
  });
}

/** Udział jednego przydziału w danym miesiącu (0, gdy go nie pokrywa). */
export function assignmentFteInMonth(a: WorkloadRow, month: string): number {
  return fteShareInMonth(a.fte, a.startDate, a.endDate, month);
}

/** Czy rola ma choć jeden dzień roboczy z niedoborem obsady. */
export function roleHasGap(role: RolePeriod, assignments: PeriodFte[]): boolean {
  return roleCoverage(role, assignments).some((c) => c.gapDays > 0);
}

/** Czy rola ma choć jeden dzień roboczy obsadzony ponad zapotrzebowanie. */
export function roleHasSurplus(role: RolePeriod, assignments: PeriodFte[]): boolean {
  return roleCoverage(role, assignments).some((c) => c.surplusDays > 0);
}
