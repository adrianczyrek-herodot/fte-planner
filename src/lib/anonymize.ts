// Anonimizacja pracownika (RODO art. 17 — prawo do bycia zapomnianym).
// Warstwa czysta: buduje nowy zestaw pól tożsamości, nie dotyka bazy, więc
// całość da się pokryć testami jednostkowymi.
//
// Dlaczego anonimizacja, a nie usunięcie rekordu: przydziały, role i koszty
// projektów wiszą na użytkowniku kaskadą. Skasowanie osoby zabrałoby razem z
// nią historię obsady projektów — informację o tym, że ktokolwiek w ogóle na
// nich pracował, i wyliczone koszty. Nadpisujemy więc dane osobowe, a pusty
// rekord zostaje jako nośnik historii. Po nadpisaniu nie da się już powiązać
// go z konkretną osobą, więc przestaje być daną osobową.

/** Domena zarezerwowana przez RFC 2606 — nigdy nie będzie istniała naprawdę. */
const DOMENA_ANONIMOWA = "usuniety.invalid";

export type AnonymizedIdentity = {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: null;
  name: null;
  image: null;
  emailVerified: null;
  positionId: null;
  status: "inactive";
  anonymizedAt: Date;
};

/**
 * Krótki, nieidentyfikujący sufiks odróżniający anonimowe rekordy od siebie.
 * Bez niego dwie zanonimizowane osoby na jednym projekcie byłyby nie do
 * rozróżnienia na liście obsady. Bierzemy końcówkę identyfikatora, który jest
 * losowy i nie niesie żadnej informacji o człowieku.
 */
export function anonymousSuffix(userId: string): string {
  return userId.slice(-4).toLowerCase();
}

/**
 * Zestaw pól, którymi nadpisujemy tożsamość. E-mail musi zostać unikalny
 * (kolumna ma więzy UNIQUE), więc budujemy go deterministycznie z id.
 *
 * Status schodzi na „nieaktywny”, a hasło i weryfikacja e-maila są czyszczone —
 * po anonimizacji nie ma już czym się zalogować.
 */
export function anonymizedIdentity(
  userId: string,
  now: Date = new Date()
): AnonymizedIdentity {
  return {
    email: `anon-${userId}@${DOMENA_ANONIMOWA}`,
    firstName: "Pracownik",
    lastName: `anonimowy ${anonymousSuffix(userId)}`,
    passwordHash: null,
    name: null,
    image: null,
    emailVerified: null,
    positionId: null,
    status: "inactive",
    anonymizedAt: now,
  };
}

/** Czy rekord został już zanonimizowany (a więc jest tylko nośnikiem historii). */
export function isAnonymized(user: { anonymizedAt: Date | null }): boolean {
  return user.anonymizedAt !== null;
}
