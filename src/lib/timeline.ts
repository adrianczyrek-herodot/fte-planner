// Czysta logika osi czasu (miesiące jako kolumny). Bez zależności od bazy/Next,
// żeby dała się testować jednostkowo. Operujemy w UTC, bo daty projektów są
// zapisywane jako UTC-północ (z inputu type="date").

/** Data → "YYYY-MM" (UTC). */
export function ym(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function firstOfMonth(month: string): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

/** "YYYY-MM" → czytelna etykieta, np. "lip 2026". */
export function formatMonthLabel(month: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    month: "short",
    year: "numeric",
  }).format(firstOfMonth(month));
}

// --- Oś dzienna (widok Gantta) ---------------------------------------------
// Daty projektów to UTC-północ, więc indeks dnia = liczba pełnych dni od epoki.

const MS_PER_DAY = 86_400_000;

export function dayIndex(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_DAY);
}

export function dateFromDayIndex(index: number): Date {
  return new Date(index * MS_PER_DAY);
}

/** Data → "YYYY-MM-DD" (UTC). */
export function ymd(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → Date (UTC-północ). */
export function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Czytelna data dnia, np. "13 lip 2026". */
export function formatDayLabel(dayIdx: number): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateFromDayIndex(dayIdx));
}

/**
 * Zakres osi (w indeksach dni) obejmujący podane dni + dziś, dosunięty do pełnych
 * miesięcy i rozszerzony do minimalnej liczby dni (żeby był scroll poziomy).
 */
export function timelineRange(
  dayIndexes: number[],
  todayDay: number,
  minDays = 150
): { rangeStartDay: number; totalDays: number } {
  const all = [...dayIndexes, todayDay];
  const minDate = dateFromDayIndex(Math.min(...all));
  const maxDate = dateFromDayIndex(Math.max(...all));

  // Dosuń do 1. dnia miesiąca (start) i ostatniego dnia miesiąca (koniec).
  let start = dayIndex(
    new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1))
  );
  let end = dayIndex(
    new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth() + 1, 0))
  );

  // Rozszerz koniec o całe miesiące, aż do osiągnięcia minimalnej szerokości.
  while (end - start + 1 < minDays) {
    const d = dateFromDayIndex(end + 1);
    end = dayIndex(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
  }

  return { rangeStartDay: start, totalDays: end - start + 1 };
}

/** Segmenty miesięcy pokrywające zakres — do nagłówka i pionowej siatki. */
export function monthSegments(
  rangeStartDay: number,
  totalDays: number
): { month: string; startDay: number; days: number }[] {
  const endDay = rangeStartDay + totalDays - 1;
  const segments: { month: string; startDay: number; days: number }[] = [];

  let cursor = dateFromDayIndex(rangeStartDay);
  cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));

  while (dayIndex(cursor) <= endDay) {
    const daysInMonth = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)
    ).getUTCDate();
    segments.push({
      month: ym(cursor),
      startDay: dayIndex(cursor),
      days: daysInMonth,
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return segments;
}
