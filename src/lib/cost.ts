// Przeliczanie zaangażowania na pieniądze. Warstwa czysta — bez bazy i bez
// Next.js — żeby dała się w całości pokryć testami jednostkowymi.
//
// Dwie decyzje projektowe są tu zaszyte i warto je znać czytając ten plik:
//
// 1. STAWKA JEST GODZINOWA. Ponieważ obsada ma granulację miesięczną, koszt
//    wymaga przelicznika „ile godzin pracy ma 1.0 FTE w danym miesiącu".
//    Liczymy go z dni roboczych (poniedziałek–piątek) razy osiem godzin.
//    Stała liczba godzin dla każdego miesiąca byłaby prostsza, ale zawyżałaby
//    luty i zaniżała lipiec — a przy stawkach to realna różnica w kwocie.
//    Świadome uproszczenie pierwszej wersji: NIE odejmujemy świąt. Gdy będą
//    potrzebne, wchodzą jako słownik dat i jedna odejmowana wartość poniżej.
//
// 2. PIENIĄDZE LICZYMY W GROSZACH, na liczbach całkowitych. Marża jest różnicą
//    dużych kwot, więc błędy zaokrągleń z liczb zmiennoprzecinkowych by się w
//    niej kumulowały. Zaokrąglamy tylko na wyjściu.

import { monthsBetween } from "@/lib/staffing";

/** Godziny pracy w jednym dniu roboczym dla 1.0 FTE. */
export const HOURS_PER_WORKING_DAY = 8;

/** Liczba dni roboczych (pon–pt) w miesiącu "YYYY-MM". */
export function workingDaysInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = new Date(Date.UTC(year, m - 1, day)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}

/** Godziny pracy dla 1.0 FTE w miesiącu "YYYY-MM". */
export function hoursInMonth(month: string): number {
  return workingDaysInMonth(month) * HOURS_PER_WORKING_DAY;
}

/** Godziny, które dane FTE daje w miesiącu — może wyjść wartość niecałkowita. */
export function fteHoursInMonth(fte: number, month: string): number {
  return Math.round(fte * hoursInMonth(month) * 100) / 100;
}

/** Kwota w PLN → grosze (liczba całkowita). */
export function toGrosze(pln: number): number {
  return Math.round(pln * 100);
}

/** Grosze → tekst w złotówkach, do wyświetlenia. */
export function formatGrosze(grosze: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
    // Polski locale domyślnie pomija separator przy czterech cyfrach ("4800"),
    // co w kolumnie kwot obok "84 840" wygląda na niedopatrzenie.
    useGrouping: "always",
  }).format(grosze / 100);
}

export type MonthCost = {
  month: string;
  hours: number;
  /** Koszt miesiąca w groszach. */
  grosze: number;
};

/**
 * Koszt jednego przydziału, miesiąc po miesiącu.
 *
 * Zaokrąglamy do pełnych groszy PER MIESIĄC, a nie raz na końcu — bo koszt
 * miesięczny jest tu jednostką raportowania (zestawienie z budżetem, marża per
 * miesiąc) i suma pokazanych wierszy musi się zgadzać z sumą całkowitą.
 */
export function assignmentCostByMonth(
  assignment: { startMonth: string; endMonth: string; fte: number },
  hourlyRateGrosze: number
): MonthCost[] {
  return monthsBetween(assignment.startMonth, assignment.endMonth).map((month) => {
    const hours = fteHoursInMonth(assignment.fte, month);
    return { month, hours, grosze: Math.round(hours * hourlyRateGrosze) };
  });
}

/** Łączny koszt przydziału w groszach. */
export function assignmentCostGrosze(
  assignment: { startMonth: string; endMonth: string; fte: number },
  hourlyRateGrosze: number
): number {
  return assignmentCostByMonth(assignment, hourlyRateGrosze).reduce(
    (sum, m) => sum + m.grosze,
    0
  );
}

export type RateEntry = {
  /** Stawka godzinowa w groszach. */
  grosze: number;
  /** Data, od której stawka obowiązuje (UTC, początek dnia). */
  validFrom: Date;
};

/**
 * Stawka obowiązująca w danym miesiącu: najpóźniejsza, której data
 * obowiązywania nie jest późniejsza niż PIERWSZY DZIEŃ tego miesiąca.
 *
 * Wybór pierwszego dnia jest świadomy: obsada ma granulację miesięczną, więc
 * podwyżka wchodząca w połowie miesiąca musi mieć jednoznaczny moment. Zasada
 * brzmi „stawka z początku miesiąca obowiązuje przez cały miesiąc", a zmiana
 * od 15. działa od kolejnego miesiąca.
 */
export function rateForMonth(
  rates: RateEntry[],
  month: string
): RateEntry | null {
  const [year, m] = month.split("-").map(Number);
  const monthStart = Date.UTC(year, m - 1, 1);

  const obowiazujace = rates
    .filter((r) => r.validFrom.getTime() <= monthStart)
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());

  return obowiazujace[0] ?? null;
}

/**
 * Stawka obowiązująca dla przydziału: własna stawka pracownika, a gdy jej nie
 * ma — uśredniona stawka jego stanowiska. Zwraca też źródło, żeby interfejs
 * mógł uczciwie pokazać, że kwota opiera się na wartości zastępczej.
 */
export function effectiveHourlyRate(
  employeeRateGrosze: number | null | undefined,
  positionRateGrosze: number | null | undefined
): { grosze: number; source: "employee" | "position" } | null {
  if (employeeRateGrosze != null) {
    return { grosze: employeeRateGrosze, source: "employee" };
  }
  if (positionRateGrosze != null) {
    return { grosze: positionRateGrosze, source: "position" };
  }
  return null;
}

export type RateSource = "employee" | "position";

export type AssignmentCostMonth = MonthCost & {
  /** Skąd wzięła się stawka użyta w tym miesiącu. */
  rateSource: RateSource | null;
  /** Stawka godzinowa użyta w tym miesiącu, w groszach. */
  rateGrosze: number | null;
};

/**
 * Koszt przydziału miesiąc po miesiącu, z uwzględnieniem historii stawek i
 * fallbacku na stanowisko. Miesiąc bez żadnej stawki ma koszt null-owy
 * (grosze 0 i rateSource null) — nie zgadujemy kwoty, bo zaniżony koszt jest
 * gorszy niż jawnie brakujący.
 */
export function assignmentCostWithRates(
  assignment: { startMonth: string; endMonth: string; fte: number },
  employeeRates: RateEntry[],
  positionRates: RateEntry[]
): AssignmentCostMonth[] {
  return monthsBetween(assignment.startMonth, assignment.endMonth).map((month) => {
    const hours = fteHoursInMonth(assignment.fte, month);
    const own = rateForMonth(employeeRates, month);
    const fallback = rateForMonth(positionRates, month);
    const chosen = own ?? fallback;

    return {
      month,
      hours,
      grosze: chosen ? Math.round(hours * chosen.grosze) : 0,
      rateGrosze: chosen?.grosze ?? null,
      rateSource: chosen ? (own ? "employee" : "position") : null,
    };
  });
}

export type ProjectCostSummary = {
  /** Koszt wynagrodzeń w groszach. */
  laborGrosze: number;
  /** Koszty dodatkowe (narzędzia, sprzęt, licencje) w groszach. */
  extraGrosze: number;
  totalGrosze: number;
  /** Budżet projektu w groszach; null, gdy nieustawiony. */
  budgetGrosze: number | null;
  /** Budżet minus koszty; null bez budżetu. */
  marginGrosze: number | null;
  /** Marża jako procent budżetu; null bez budżetu lub przy budżecie zerowym. */
  marginPercent: number | null;
  /** Liczba miesięcy przydziałów, dla których nie znaleziono żadnej stawki. */
  monthsWithoutRate: number;
};

/**
 * Zestawienie kosztu projektu z budżetem. `monthsWithoutRate` jest częścią
 * wyniku, a nie szczegółem implementacji: bez tej liczby marża wyglądałaby
 * korzystnie właśnie dlatego, że brakuje danych.
 */
export function projectCostSummary(
  laborMonths: AssignmentCostMonth[],
  extraAmountsGrosze: number[],
  budgetGrosze: number | null
): ProjectCostSummary {
  const laborGrosze = laborMonths.reduce((sum, m) => sum + m.grosze, 0);
  const extraGrosze = extraAmountsGrosze.reduce((sum, a) => sum + a, 0);
  const totalGrosze = laborGrosze + extraGrosze;

  return {
    laborGrosze,
    extraGrosze,
    totalGrosze,
    budgetGrosze,
    marginGrosze: budgetGrosze == null ? null : budgetGrosze - totalGrosze,
    marginPercent:
      budgetGrosze == null || budgetGrosze === 0
        ? null
        : Math.round(((budgetGrosze - totalGrosze) / budgetGrosze) * 100),
    monthsWithoutRate: laborMonths.filter((m) => m.rateSource === null).length,
  };
}
