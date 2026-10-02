import * as z from "zod";

import "@/lib/validation/locale";

// Adres e-mail porównujemy bez względu na wielkość liter: „Jan@firma.pl" i
// „jan@firma.pl" to ta sama skrzynka. Nowe adresy zapisujemy małymi literami,
// a wyszukiwanie (emailLookup) i tak jest niewrażliwe na wielkość liter —
// konta założone wcześniej z wielkimi literami nadal się odnajdą.
export const emailField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.email({ error: "Podaj poprawny adres e-mail." })
);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Warunek `where` dla Prismy: ten sam adres niezależnie od wielkości liter. */
export function emailLookup(email: string) {
  return { email: { equals: normalizeEmail(email), mode: "insensitive" as const } };
}
