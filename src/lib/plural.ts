/**
 * Polska forma rzeczownika po liczebniku: 1 osoba, 2–4 osoby, 5 osób,
 * ale 22 osoby i 12 osób (końcówki 12–14 biorą formę „wiele").
 */
export function polishPlural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  const lastTwo = abs % 100;
  const last = abs % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

/** Liczba razem z odmienionym rzeczownikiem, np. „3 role", „5 ról". */
export function pluralize(n: number, one: string, few: string, many: string): string {
  return `${n} ${polishPlural(n, one, few, many)}`;
}
