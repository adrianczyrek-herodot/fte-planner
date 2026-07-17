// Czysta logika osi czasu (miesiące jako kolumny). Bez zależności od bazy/Next,
// żeby dała się testować jednostkowo. Operujemy w UTC, bo daty projektów są
// zapisywane jako UTC-północ (z inputu type="date").

/** Data → "YYYY-MM" (UTC). */
export function ym(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM" → indeks miesiąca (rok*12 + miesiąc), do arytmetyki różnic. */
export function ymIndex(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
}

/** Indeks miesiąca → "YYYY-MM". */
export function indexToYm(index: number): string {
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function firstOfMonth(month: string): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

function shiftMonths(date: Date, delta: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, date.getUTCDate())
  );
}

/** Miesiąc, w którym kafelek projektu jest zakotwiczony (start, a jak brak — koniec). */
export function projectAnchorMonth(
  startDate: Date | null,
  endDate: Date | null
): string | null {
  const anchor = startDate ?? endDate;
  return anchor ? ym(anchor) : null;
}

/**
 * Nowe daty projektu po przeciągnięciu kafelka na `targetMonth`:
 * - obie daty przesuwane o tę samą liczbę miesięcy (zachowanie czasu trwania),
 * - projekt bez dat → ustaw start na pierwszy dzień docelowego miesiąca.
 */
export function moveDatesToMonth(
  startDate: Date | null,
  endDate: Date | null,
  targetMonth: string
): { startDate: Date | null; endDate: Date | null } {
  const anchor = startDate ?? endDate;
  if (!anchor) {
    return { startDate: firstOfMonth(targetMonth), endDate: null };
  }
  const delta = ymIndex(targetMonth) - ymIndex(ym(anchor));
  return {
    startDate: startDate ? shiftMonths(startDate, delta) : null,
    endDate: endDate ? shiftMonths(endDate, delta) : null,
  };
}

/**
 * Ciągły zakres miesięcy pokrywający zadane miesiące + bieżący, z paddingiem
 * po jednym z każdej strony i minimalną szerokością (żeby był scroll poziomy).
 */
export function monthRange(
  anchorMonths: string[],
  currentMonth: string,
  minWidth = 12
): string[] {
  const indexes = [...anchorMonths, currentMonth].map(ymIndex);
  let min = Math.min(...indexes) - 1;
  let max = Math.max(...indexes) + 1;
  while (max - min + 1 < minWidth) max++;

  const range: string[] = [];
  for (let i = min; i <= max; i++) range.push(indexToYm(i));
  return range;
}

/** "YYYY-MM" → czytelna etykieta, np. "lip 2026". */
export function formatMonthLabel(month: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    month: "short",
    year: "numeric",
  }).format(firstOfMonth(month));
}
