// Przeliczanie zaangażowania na pieniądze. Warstwa czysta — bez bazy i bez
// Next.js — żeby dała się w całości pokryć testami jednostkowymi.
//
// Dwie decyzje projektowe są tu zaszyte i warto je znać czytając ten plik:
//
// 1. STAWKA JEST GODZINOWA, a obsada ma granulację dzienną, więc koszt wymaga
//    przelicznika „ile godzin pracy daje to FTE w dniach, które pokrywa".
//    Liczymy go z dni roboczych (poniedziałek–piątek, bez dni ustawowo wolnych)
//    razy osiem godzin. Stała liczba godzin dla każdego miesiąca byłaby
//    prostsza, ale zawyżałaby luty i zaniżała lipiec — a przy stawkach to
//    realna różnica w kwocie. Kalendarz świąt siedzi w `@/lib/holidays`.
//
//    Czego wciąż NIE uwzględniamy: urlopów, zwolnień i innych nieobecności
//    konkretnej osoby. To wymaga danych, których aplikacja dziś nie zbiera —
//    wejdą naturalnie razem z warstwą rzeczywistego czasu pracy.
//
// 2. PIENIĄDZE LICZYMY W GROSZACH, na liczbach całkowitych. Marża jest różnicą
//    dużych kwot, więc błędy zaokrągleń z liczb zmiennoprzecinkowych by się w
//    niej kumulowały. Zaokrąglamy tylko na wyjściu.

import { workingDayHolidaysInMonth } from "@/lib/holidays";
import {
  clampToMonth,
  isWorkingDay,
  monthsCovered,
  workingDaysCoveredInMonth,
} from "@/lib/period";
import { dateFromDayIndex, dayIndex } from "@/lib/timeline";

/** Godziny pracy w jednym dniu roboczym dla 1.0 FTE. */
export const HOURS_PER_WORKING_DAY = 8;

/**
 * Liczba dni roboczych w miesiącu "YYYY-MM": dni od poniedziałku do piątku
 * pomniejszone o dni ustawowo wolne od pracy, które w taki dzień wypadają.
 * Święto w sobotę lub niedzielę nic nie zmienia — świadomie: współpraca jest
 * rozliczana w modelu B2B, więc nie stosujemy reguły z Kodeksu pracy, w której
 * święto w sobotę obniża wymiar czasu pracy.
 */
export function workingDaysInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = new Date(Date.UTC(year, m - 1, day)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count - workingDayHolidaysInMonth(month).length;
}

/** Godziny pracy dla 1.0 FTE w miesiącu "YYYY-MM". */
export function hoursInMonth(month: string): number {
  return workingDaysInMonth(month) * HOURS_PER_WORKING_DAY;
}

/** Godziny, które dane FTE daje w PEŁNYM miesiącu — może wyjść niecałkowita. */
export function fteHoursInMonth(fte: number, month: string): number {
  return Math.round(fte * hoursInMonth(month) * 100) / 100;
}

/**
 * Godziny przydziału w danym miesiącu, licząc wyłącznie dni robocze, które ten
 * przydział faktycznie pokrywa. To jest powód, dla którego przeszliśmy na dni:
 * obsada od 12 do 26 lipca kosztuje teraz jedenaście dni roboczych, a nie cały
 * lipiec.
 */
export function assignmentHoursInMonth(
  assignment: { startDate: Date; endDate: Date; fte: number },
  month: string
): number {
  const days = workingDaysCoveredInMonth(
    assignment.startDate,
    assignment.endDate,
    month
  );
  return Math.round(assignment.fte * days * HOURS_PER_WORKING_DAY * 100) / 100;
}

/** Kwota w PLN → grosze (liczba całkowita). */
export function toGrosze(pln: number): number {
  return Math.round(pln * 100);
}

/** Grosze → tekst w złotówkach z groszami, do wyświetlenia. */
export function formatGrosze(grosze: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    // Zawsze z groszami: przy stawkach 85,50 zł/h zaokrąglenie do złotówek
    // rozjeżdżało sumy wierszy z sumą całkowitą.
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  assignment: { startDate: Date; endDate: Date; fte: number },
  hourlyRateGrosze: number
): MonthCost[] {
  return monthsCovered(assignment.startDate, assignment.endDate).map((month) => {
    const hours = assignmentHoursInMonth(assignment, month);
    return { month, hours, grosze: Math.round(hours * hourlyRateGrosze) };
  });
}

/** Łączny koszt przydziału w groszach. */
export function assignmentCostGrosze(
  assignment: { startDate: Date; endDate: Date; fte: number },
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
 * Stawka obowiązująca w danym dniu: najpóźniejsza, której data obowiązywania
 * nie jest późniejsza niż ten dzień. Stawka działa dokładnie od wpisanej daty —
 * podwyżka od 15. października liczy się od 15., a nie od listopada.
 */
export function rateOnDay(rates: RateEntry[], day: Date): RateEntry | null {
  let best: RateEntry | null = null;
  for (const r of rates) {
    if (r.validFrom.getTime() > day.getTime()) continue;
    if (!best || r.validFrom.getTime() > best.validFrom.getTime()) best = r;
  }
  return best;
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
  /**
   * Skąd wzięła się stawka: "position", gdy choć jeden dzień liczono stawką
   * stanowiska, "employee", gdy wszystkie własną stawką pracownika, null, gdy
   * w tym miesiącu nie użyto żadnej stawki.
   */
  rateSource: RateSource | null;
  /** Stawka godzinowa w groszach, gdy przez cały miesiąc była jedna; inaczej null. */
  rateGrosze: number | null;
  /**
   * Czy w którymś pracującym dniu tego miesiąca zabrakło stawki. Godziny z tych
   * dni nie mają kosztu, więc koszt i marża są wtedy niedoszacowane.
   */
  missingRate: boolean;
};

/**
 * Koszt przydziału miesiąc po miesiącu, z uwzględnieniem historii stawek i
 * fallbacku na stanowisko. Stawkę wybieramy dla każdego dnia roboczego osobno,
 * więc zmiana stawki w połowie miesiąca działa od swojej daty. Dzień bez żadnej
 * stawki nie ma kosztu i oznacza miesiąc jako niepełny — nie zgadujemy kwoty,
 * bo zaniżony koszt jest gorszy niż jawnie brakujący.
 */
export function assignmentCostWithRates(
  assignment: { startDate: Date; endDate: Date; fte: number },
  employeeRates: RateEntry[],
  positionRates: RateEntry[]
): AssignmentCostMonth[] {
  const dayHours = assignment.fte * HOURS_PER_WORKING_DAY;

  return monthsCovered(assignment.startDate, assignment.endDate).map((month) => {
    const hours = assignmentHoursInMonth(assignment, month);
    const part = clampToMonth(assignment.startDate, assignment.endDate, month);

    let exactGrosze = 0;
    let usedOwn = false;
    let usedPosition = false;
    let missingRate = false;
    const ratesUsed = new Set<number>();

    if (part && dayHours > 0) {
      for (let d = dayIndex(part.from); d <= dayIndex(part.to); d++) {
        const day = dateFromDayIndex(d);
        if (!isWorkingDay(day)) continue;

        const own = rateOnDay(employeeRates, day);
        const chosen = own ?? rateOnDay(positionRates, day);
        if (!chosen) {
          missingRate = true;
          continue;
        }
        if (own) usedOwn = true;
        else usedPosition = true;
        ratesUsed.add(chosen.grosze);
        exactGrosze += dayHours * chosen.grosze;
      }
    }

    return {
      month,
      hours,
      grosze: Math.round(exactGrosze),
      rateGrosze: ratesUsed.size === 1 ? [...ratesUsed][0] : null,
      rateSource: usedPosition ? "position" : usedOwn ? "employee" : null,
      missingRate,
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
  /** Liczba miesięcy przydziałów, w których choć jeden dzień nie miał stawki. */
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
    monthsWithoutRate: laborMonths.filter((m) => m.missingRate).length,
  };
}
