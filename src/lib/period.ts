// Okresy z dokładnością do dnia. Warstwa czysta — bez bazy i bez Next.js.
//
// Obsada jest planowana na konkretne dni, ale raportowanie (koszt, siatka
// obłożenia, pokrycie roli) dalej dzieje się w miesiącach. Ten moduł jest
// pomostem między jednym a drugim: odpowiada na pytanie „ile z tego miesiąca
// faktycznie pokrywa ten przydział".
//
// Jedna zasada trzyma to w kupie: wszystko liczymy w DNIACH ROBOCZYCH, nigdy w
// kalendarzowych. Przydział na 1–15 lutego i taki sam na 1–15 sierpnia nie
// oznaczają tyle samo pracy, a różnicy w kalendarzowych dniach nie widać.

import { isHoliday } from "@/lib/holidays";
import { dayIndex, dateFromDayIndex, ym } from "@/lib/timeline";

/** Czy dzień jest roboczy: poniedziałek–piątek i nie jest ustawowo wolny. */
export function isWorkingDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !isHoliday(date);
}

/** Liczba dni roboczych w zakresie [from, to] włącznie. Pusty zakres → 0. */
export function workingDaysBetween(from: Date, to: Date): number {
  const start = dayIndex(from);
  const end = dayIndex(to);
  if (end < start) return 0;

  let count = 0;
  for (let i = start; i <= end; i++) {
    if (isWorkingDay(dateFromDayIndex(i))) count++;
  }
  return count;
}

/** Pierwszy i ostatni dzień miesiąca "YYYY-MM". */
export function monthBounds(month: string): { first: Date; last: Date } {
  const [year, m] = month.split("-").map(Number);
  return {
    first: new Date(Date.UTC(year, m - 1, 1)),
    last: new Date(Date.UTC(year, m, 0)),
  };
}

/** Miesiące "YYYY-MM", których dotyka zakres [start, end]. */
export function monthsCovered(start: Date, end: Date): string[] {
  if (end < start) return [];

  const out: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const lastMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor <= lastMonth) {
    out.push(ym(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

/**
 * Część zakresu wpadająca w dany miesiąc, albo null, gdy nie wpada wcale.
 * Zwracamy granice, a nie samą liczbę dni, żeby wywołujący mógł policzyć na
 * nich co innego niż dni robocze, gdy zajdzie potrzeba.
 */
export function clampToMonth(
  start: Date,
  end: Date,
  month: string
): { from: Date; to: Date } | null {
  const { first, last } = monthBounds(month);
  const from = start > first ? start : first;
  const to = end < last ? end : last;
  return to < from ? null : { from, to };
}

/** Dni robocze, które przydział o tym zakresie zajmuje w danym miesiącu. */
export function workingDaysCoveredInMonth(
  start: Date,
  end: Date,
  month: string
): number {
  const part = clampToMonth(start, end, month);
  return part ? workingDaysBetween(part.from, part.to) : 0;
}

/**
 * Ile etatu zajmuje przydział w skali CAŁEGO miesiąca.
 *
 * Pełne 1.0 FTE przez połowę dni roboczych lipca to w skali lipca 0.5 — i tak
 * właśnie liczymy, bo inaczej suma miesięczna zawyżałaby zaangażowanie osoby,
 * która zmienia projekt w połowie miesiąca. Do wykrywania przeciążenia służy
 * osobna miara, liczona per dzień (patrz `dailyOverloadDays`).
 */
export function fteShareInMonth(
  fte: number,
  start: Date,
  end: Date,
  month: string
): number {
  const { first, last } = monthBounds(month);
  const total = workingDaysBetween(first, last);
  if (total === 0) return 0;

  const covered = workingDaysCoveredInMonth(start, end, month);
  return Math.round((fte * covered * 100) / total) / 100;
}
