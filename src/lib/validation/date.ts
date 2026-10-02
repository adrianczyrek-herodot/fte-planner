import * as z from "zod";

import { parseYmd } from "@/lib/timeline";

// Rozsądny zakres lat. Nie chodzi o politykę firmy, tylko o literówki: rok
// 2126 zamiast 2026 przechodził walidację, a potem każda strona liczyła
// konflikty i pokrycie dzień po dniu przez sto lat.
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

/** Dzień "RRRR-MM-DD": format, istnienie daty (bez 31 lutego) i zakres lat. */
export const dayString = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    error: "Data w formacie RRRR-MM-DD.",
  })
  .refine(
    (value) => {
      const [y, m, d] = value.split("-").map(Number);
      const parsed = new Date(Date.UTC(y, m - 1, d));
      return parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
    },
    { error: "Taka data nie istnieje." }
  )
  .refine(
    (value) => {
      const y = Number(value.slice(0, 4));
      return y >= MIN_YEAR && y <= MAX_YEAR;
    },
    { error: `Podaj rok z zakresu ${MIN_YEAR}–${MAX_YEAR}.` }
  );

/** Dzień jako Date (UTC-północ) — tak trzymamy daty w bazie. */
export const dayDate = dayString.transform(parseYmd);

/** Puste pole → null, inaczej dzień jako Date (UTC-północ). */
export const optionalDayDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null),
  dayDate.nullable()
);

/**
 * Liczba z formularza z polskim przecinkiem dziesiętnym: „1500,50" → 1500.50.
 * Pole type="number" w przeglądarce wysyła kropkę, ale wpis wklejony albo
 * wysłany inaczej nie powinien kończyć się błędem „to nie jest liczba".
 */
export function decimalInput(value: unknown): unknown {
  return typeof value === "string" ? value.trim().replace(/\s/g, "").replace(",", ".") : value;
}
