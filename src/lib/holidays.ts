// Polskie dni ustawowo wolne od pracy. Warstwa czysta — bez bazy i bez Next.js,
// w całości pokryta testami jednostkowymi.
//
// Potrzebne, bo koszt liczymy ze stawki godzinowej razy liczba godzin pracy w
// miesiącu. Liczenie samych dni roboczych jako poniedziałek–piątek zawyżało
// godziny w miesiącach ze świętami, a przez to koszt — i zaniżało marżę.
//
// Święta dzielą się na stałe (ta sama data co roku) i ruchome (liczone od
// Wielkanocy). Wielkanoc wyznaczamy algorytmem, a nie tablicą dat, żeby moduł
// nie wymagał corocznej aktualizacji.

/** Dni ustawowo wolne o stałej dacie: [miesiąc, dzień]. */
const STALE: ReadonlyArray<readonly [number, number]> = [
  [1, 1], // Nowy Rok
  [1, 6], // Trzech Króli
  [5, 1], // Święto Państwowe
  [5, 3], // Święto Narodowe Trzeciego Maja
  [8, 15], // Wniebowzięcie NMP / Święto Wojska Polskiego
  [11, 1], // Wszystkich Świętych
  [11, 11], // Narodowe Święto Niepodległości
  [12, 25], // Boże Narodzenie
  [12, 26], // drugi dzień Bożego Narodzenia
];

/**
 * Pierwszy rok, w którym Wigilia (24 grudnia) jest dniem ustawowo wolnym od
 * pracy. Zmiana ustawy o dniach wolnych od pracy weszła w życie w 2025 r., więc
 * dla wcześniejszych lat 24 grudnia jest zwykłym dniem roboczym.
 */
export const WIGILIA_WOLNA_OD_ROKU = 2025;

/**
 * Niedziela wielkanocna w kalendarzu gregoriańskim (algorytm Meeusa/Butchera).
 * Zwraca datę w UTC, ustawioną na północ.
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

/** Data w formacie "YYYY-MM-DD" (UTC). */
function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Data przesunięta o podaną liczbę dni. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * Wszystkie dni ustawowo wolne w danym roku, jako zbiór dat "YYYY-MM-DD".
 *
 * Wielkanoc i Zielone Świątki zawsze wypadają w niedzielę, więc na liczbę dni
 * roboczych nie wpływają — trzymamy je tu mimo to, żeby zbiór był kompletną
 * odpowiedzią na pytanie „czy to dzień ustawowo wolny”, a nie tylko wejściem
 * do jednego wyliczenia.
 */
export function holidaysInYear(year: number): Set<string> {
  const out = new Set<string>();

  for (const [month, day] of STALE) {
    out.add(iso(new Date(Date.UTC(year, month - 1, day))));
  }

  if (year >= WIGILIA_WOLNA_OD_ROKU) {
    out.add(iso(new Date(Date.UTC(year, 11, 24))));
  }

  const easter = easterSunday(year);
  out.add(iso(easter)); // Wielkanoc (niedziela)
  out.add(iso(addDays(easter, 1))); // Poniedziałek Wielkanocny
  out.add(iso(addDays(easter, 49))); // Zielone Świątki (niedziela)
  out.add(iso(addDays(easter, 60))); // Boże Ciało (czwartek)

  return out;
}

/** Czy podana data (UTC) jest dniem ustawowo wolnym od pracy. */
export function isHoliday(date: Date): boolean {
  return holidaysInYear(date.getUTCFullYear()).has(iso(date));
}

/**
 * Dni ustawowo wolne w miesiącu "YYYY-MM", które wypadają w dzień roboczy
 * (pon–pt) — czyli te, które faktycznie zabierają godziny pracy. Święto w
 * sobotę lub niedzielę nic nie zmienia, bo tych dni i tak nie liczymy.
 */
export function workingDayHolidaysInMonth(month: string): string[] {
  const year = Number(month.slice(0, 4));
  const prefix = `${month}-`;

  return [...holidaysInYear(year)]
    .filter((d) => d.startsWith(prefix))
    .filter((d) => {
      const weekday = new Date(`${d}T00:00:00Z`).getUTCDay();
      return weekday !== 0 && weekday !== 6;
    })
    .sort();
}
