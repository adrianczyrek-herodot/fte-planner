import { describe, expect, it } from "vitest";

import {
  assignmentCostByMonth,
  assignmentCostWithRates,
  projectCostSummary,
  rateForMonth,
  assignmentCostGrosze,
  effectiveHourlyRate,
  formatGrosze,
  fteHoursInMonth,
  hoursInMonth,
  toGrosze,
  workingDaysInMonth,
} from "./cost";

describe("workingDaysInMonth", () => {
  it("liczy dni robocze, nie wszystkie dni miesiąca", () => {
    // Luty 2026: 28 dni, zaczyna się w niedzielę → 20 dni roboczych.
    expect(workingDaysInMonth("2026-02")).toBe(20);
    // Lipiec 2026: 31 dni, zaczyna się w środę → 23 dni roboczych.
    expect(workingDaysInMonth("2026-07")).toBe(23);
    // Sierpień 2026: 31 dni, zaczyna się w sobotę → 21 dni roboczych.
    expect(workingDaysInMonth("2026-08")).toBe(21);
  });

  it("radzi sobie z rokiem przestępnym", () => {
    // Luty 2028 ma 29 dni i zaczyna się we wtorek → 21 dni roboczych.
    expect(workingDaysInMonth("2028-02")).toBe(21);
  });

  it("odejmuje dni ustawowo wolne wypadające w dzień roboczy", () => {
    // Styczeń 2026: 22 dni pon–pt, minus Nowy Rok (czwartek) i Trzech Króli
    // (wtorek) → 20.
    expect(workingDaysInMonth("2026-01")).toBe(20);
    // Maj 2026: 21 dni pon–pt, minus 1 maja (piątek); 3 maja to niedziela → 20.
    expect(workingDaysInMonth("2026-05")).toBe(20);
    // Listopad 2026: 21 dni pon–pt, minus 11 listopada (środa);
    // Wszystkich Świętych wypada w niedzielę → 20.
    expect(workingDaysInMonth("2026-11")).toBe(20);
  });

  it("uwzględnia święta ruchome", () => {
    // Kwiecień 2026: 22 dni pon–pt, minus Poniedziałek Wielkanocny → 21.
    expect(workingDaysInMonth("2026-04")).toBe(21);
    // Czerwiec 2026: 22 dni pon–pt, minus Boże Ciało (czwartek) → 21.
    expect(workingDaysInMonth("2026-06")).toBe(21);
  });

  it("nie odejmuje świąt wypadających w weekend", () => {
    // 15 sierpnia 2026 to sobota — liczba dni roboczych się nie zmienia.
    expect(workingDaysInMonth("2026-08")).toBe(21);
  });

  it("traktuje Wigilię jako wolną dopiero od 2025 roku", () => {
    // Grudzień 2024: 22 dni pon–pt, minus 25 i 26 grudnia → 20.
    expect(workingDaysInMonth("2024-12")).toBe(20);
    // Grudzień 2025: 23 dni pon–pt, minus 24, 25 i 26 grudnia → 20.
    expect(workingDaysInMonth("2025-12")).toBe(20);
  });
});

describe("hoursInMonth", () => {
  it("różnica między miesiącami jest realna, dlatego nie używamy stałej", () => {
    expect(hoursInMonth("2026-02")).toBe(160);
    expect(hoursInMonth("2026-07")).toBe(184);
    // 24 godziny różnicy przy stawce 150 zł to 3 600 zł na jednym etacie.
    expect(hoursInMonth("2026-07") - hoursInMonth("2026-02")).toBe(24);
  });
});

describe("fteHoursInMonth", () => {
  it("skaluje godziny przez FTE", () => {
    expect(fteHoursInMonth(1, "2026-07")).toBe(184);
    expect(fteHoursInMonth(0.5, "2026-07")).toBe(92);
    expect(fteHoursInMonth(0.7, "2026-07")).toBe(128.8);
  });
});

describe("toGrosze / formatGrosze", () => {
  it("zamienia złotówki na grosze bez błędu zmiennoprzecinkowego", () => {
    expect(toGrosze(150)).toBe(15000);
    expect(toGrosze(150.55)).toBe(15055);
    // 0.1 + 0.2 w liczbach zmiennoprzecinkowych daje 0.30000000000000004
    expect(toGrosze(0.1) + toGrosze(0.2)).toBe(30);
  });

  it("formatuje grosze jako kwotę w złotych", () => {
    // 1 500 000 groszy = 15 000 zł. Intl wstawia twardą spację jako separator.
    expect(formatGrosze(1500000).replace(/\u00a0/g, " ")).toBe("15 000 zł");
    // Grupowanie wymuszone także dla czterech cyfr — inaczej kolumna kwot
    // mieszałaby "4800 zł" z "84 840 zł".
    expect(formatGrosze(480000).replace(/\u00a0/g, " ")).toBe("4 800 zł");
    expect(formatGrosze(150000000).replace(/\u00a0/g, " ")).toBe("1 500 000 zł");
  });
});

describe("assignmentCostByMonth", () => {
  const rate = toGrosze(150); // 150 zł/h

  it("liczy koszt osobno dla każdego miesiąca okresu", () => {
    const koszty = assignmentCostByMonth(
      { startMonth: "2026-02", endMonth: "2026-03", fte: 1 },
      rate
    );
    expect(koszty).toHaveLength(2);
    // Luty: 160 h × 150 zł = 24 000 zł
    expect(koszty[0]).toEqual({ month: "2026-02", hours: 160, grosze: 2400000 });
    // Marzec 2026: 22 dni roboczych → 176 h × 150 zł = 26 400 zł
    expect(koszty[1]).toEqual({ month: "2026-03", hours: 176, grosze: 2640000 });
  });

  it("suma miesięcy zgadza się z sumą całkowitą", () => {
    const a = { startMonth: "2026-07", endMonth: "2026-10", fte: 0.7 };
    const perMonth = assignmentCostByMonth(a, rate);
    const suma = perMonth.reduce((s, m) => s + m.grosze, 0);
    expect(assignmentCostGrosze(a, rate)).toBe(suma);
  });

  it("pół etatu kosztuje połowę pełnego", () => {
    const pelny = assignmentCostGrosze(
      { startMonth: "2026-07", endMonth: "2026-07", fte: 1 },
      rate
    );
    const polowa = assignmentCostGrosze(
      { startMonth: "2026-07", endMonth: "2026-07", fte: 0.5 },
      rate
    );
    expect(polowa * 2).toBe(pelny);
  });

  it("jeden miesiąc okresu to jeden wiersz kosztu", () => {
    const koszty = assignmentCostByMonth(
      { startMonth: "2026-05", endMonth: "2026-05", fte: 1 },
      rate
    );
    expect(koszty).toHaveLength(1);
  });
});

describe("effectiveHourlyRate", () => {
  it("stawka pracownika ma pierwszeństwo nad stawką stanowiska", () => {
    expect(effectiveHourlyRate(18000, 15000)).toEqual({
      grosze: 18000,
      source: "employee",
    });
  });

  it("brak stawki pracownika → uśredniona stawka stanowiska", () => {
    expect(effectiveHourlyRate(null, 15000)).toEqual({
      grosze: 15000,
      source: "position",
    });
  });

  it("brak obu → null, bo kosztu nie wolno zmyślać", () => {
    expect(effectiveHourlyRate(null, null)).toBeNull();
    expect(effectiveHourlyRate(undefined, undefined)).toBeNull();
  });

  it("stawka zero jest wartością, nie brakiem danych", () => {
    expect(effectiveHourlyRate(0, 15000)).toEqual({ grosze: 0, source: "employee" });
  });
});

const dzien = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("rateForMonth", () => {
  const stawki = [
    { grosze: 15000, validFrom: dzien("2026-01-01") }, // 150 zł
    { grosze: 18000, validFrom: dzien("2026-07-01") }, // 180 zł od lipca
  ];

  it("bierze stawkę obowiązującą na początek miesiąca", () => {
    expect(rateForMonth(stawki, "2026-06")?.grosze).toBe(15000);
    expect(rateForMonth(stawki, "2026-07")?.grosze).toBe(18000);
    expect(rateForMonth(stawki, "2026-12")?.grosze).toBe(18000);
  });

  it("miesiąc przed pierwszą stawką nie ma stawki", () => {
    expect(rateForMonth(stawki, "2025-12")).toBeNull();
  });

  it("podwyżka w połowie miesiąca działa od kolejnego miesiąca", () => {
    const zSrodka = [{ grosze: 20000, validFrom: dzien("2026-08-15") }];
    expect(rateForMonth(zSrodka, "2026-08")).toBeNull();
    expect(rateForMonth(zSrodka, "2026-09")?.grosze).toBe(20000);
  });

  it("kolejność wpisów nie ma znaczenia", () => {
    const odwrotnie = [...stawki].reverse();
    expect(rateForMonth(odwrotnie, "2026-08")?.grosze).toBe(18000);
  });
});

describe("assignmentCostWithRates", () => {
  const pracownika = [{ grosze: 15000, validFrom: dzien("2026-01-01") }];
  const stanowiska = [{ grosze: 12000, validFrom: dzien("2026-01-01") }];

  it("historia stawek działa w obrębie jednego przydziału", () => {
    const zPodwyzka = [
      { grosze: 15000, validFrom: dzien("2026-01-01") },
      { grosze: 18000, validFrom: dzien("2026-08-01") },
    ];
    const miesiace = assignmentCostWithRates(
      { startMonth: "2026-07", endMonth: "2026-08", fte: 1 },
      zPodwyzka,
      []
    );
    // Lipiec: 184 h × 150 zł, sierpień: 168 h × 180 zł
    expect(miesiace[0]).toMatchObject({ rateGrosze: 15000, grosze: 2760000 });
    expect(miesiace[1]).toMatchObject({ rateGrosze: 18000, grosze: 3024000 });
  });

  it("bez stawki pracownika liczy ze stawki stanowiska i to zaznacza", () => {
    const [m] = assignmentCostWithRates(
      { startMonth: "2026-07", endMonth: "2026-07", fte: 1 },
      [],
      stanowiska
    );
    expect(m.rateSource).toBe("position");
    expect(m.grosze).toBe(184 * 12000);
  });

  it("stawka pracownika wygrywa ze stawką stanowiska", () => {
    const [m] = assignmentCostWithRates(
      { startMonth: "2026-07", endMonth: "2026-07", fte: 1 },
      pracownika,
      stanowiska
    );
    expect(m.rateSource).toBe("employee");
    expect(m.grosze).toBe(184 * 15000);
  });

  it("brak jakiejkolwiek stawki → koszt zerowy i jawny brak źródła", () => {
    const [m] = assignmentCostWithRates(
      { startMonth: "2026-07", endMonth: "2026-07", fte: 1 },
      [],
      []
    );
    expect(m).toMatchObject({ grosze: 0, rateSource: null, rateGrosze: null });
  });
});

describe("projectCostSummary", () => {
  const miesiace = assignmentCostWithRates(
    { startMonth: "2026-07", endMonth: "2026-07", fte: 1 },
    [{ grosze: 15000, validFrom: dzien("2026-01-01") }],
    []
  );

  it("sumuje wynagrodzenia z kosztami dodatkowymi i liczy marżę", () => {
    // 184 h × 150 zł = 27 600 zł; dodatkowe 5 000 zł; budżet 40 000 zł
    const s = projectCostSummary(miesiace, [toGrosze(5000)], toGrosze(40000));
    expect(s.laborGrosze).toBe(toGrosze(27600));
    expect(s.extraGrosze).toBe(toGrosze(5000));
    expect(s.totalGrosze).toBe(toGrosze(32600));
    expect(s.marginGrosze).toBe(toGrosze(7400));
    expect(s.marginPercent).toBe(19);
  });

  it("przekroczony budżet daje marżę ujemną", () => {
    const s = projectCostSummary(miesiace, [], toGrosze(20000));
    expect(s.marginGrosze).toBeLessThan(0);
    expect(s.marginPercent).toBeLessThan(0);
  });

  it("bez budżetu nie zmyślamy marży", () => {
    const s = projectCostSummary(miesiace, [], null);
    expect(s.marginGrosze).toBeNull();
    expect(s.marginPercent).toBeNull();
    expect(s.totalGrosze).toBe(toGrosze(27600));
  });

  it("liczy miesiące bez stawki, żeby marża nie kłamała brakiem danych", () => {
    const bezStawki = assignmentCostWithRates(
      { startMonth: "2026-07", endMonth: "2026-09", fte: 1 },
      [],
      []
    );
    const s = projectCostSummary(bezStawki, [], toGrosze(40000));
    expect(s.monthsWithoutRate).toBe(3);
    expect(s.laborGrosze).toBe(0);
    // Marża wygląda świetnie wyłącznie dlatego, że brakuje stawek.
    expect(s.marginGrosze).toBe(toGrosze(40000));
  });
});
