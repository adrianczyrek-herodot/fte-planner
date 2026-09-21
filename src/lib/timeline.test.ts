import { describe, expect, it } from "vitest";

import {
  dayCount,
  dayIndex,
  formatDayRange,
  monthSegments,
  parseYmd,
  timelineRange,
  ymd,
} from "./timeline";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("ymd / parseYmd / dayIndex", () => {
  it("round-trip daty i indeksu dnia", () => {
    expect(ymd(d("2026-07-13"))).toBe("2026-07-13");
    expect(ymd(parseYmd("2026-07-13"))).toBe("2026-07-13");
    // różnica dni = różnica indeksów
    expect(dayIndex(d("2026-07-13")) - dayIndex(d("2026-07-01"))).toBe(12);
  });
});

describe("formatDayRange / dayCount", () => {
  it("w tym samym roku pokazuje rok tylko raz", () => {
    const range = formatDayRange(dayIndex(d("2026-07-01")), dayIndex(d("2026-11-03")));
    expect(range).toBe("1 lip – 3 lis 2026");
  });

  it("przy przełomie roku pokazuje rok przy obu datach", () => {
    const range = formatDayRange(dayIndex(d("2026-12-20")), dayIndex(d("2027-01-05")));
    expect(range).toBe("20 gru 2026 – 5 sty 2027");
  });

  it("liczy dni włącznie z początkiem i końcem", () => {
    expect(dayCount(dayIndex(d("2026-07-01")), dayIndex(d("2026-07-01")))).toBe(1);
    expect(dayCount(dayIndex(d("2026-07-01")), dayIndex(d("2026-07-31")))).toBe(31);
  });
});

describe("timelineRange", () => {
  it("dosuwa do pełnych miesięcy i trzyma minimalną szerokość", () => {
    const start = dayIndex(d("2026-07-13"));
    const end = dayIndex(d("2026-08-10"));
    const { rangeStartDay, totalDays } = timelineRange([start, end], start, 150);
    // start dosunięty do 1. dnia miesiąca
    expect(ymd(dateFromRange(rangeStartDay))).toMatch(/-01$/);
    expect(totalDays).toBeGreaterThanOrEqual(150);
  });
});

describe("monthSegments", () => {
  it("pokrywa cały zakres ciągłymi, nienachodzącymi miesiącami", () => {
    const start = dayIndex(d("2026-07-01"));
    const segs = monthSegments(start, 120);
    // pierwszy segment zaczyna się na starcie zakresu
    expect(segs[0].startDay).toBe(start);
    // ciągłość: kolejny zaczyna się dokładnie po poprzednim
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].startDay).toBe(segs[i - 1].startDay + segs[i - 1].days);
    }
    // suma dni pokrywa >= totalDays
    const covered = segs.reduce((a, s) => a + s.days, 0);
    expect(covered).toBeGreaterThanOrEqual(120);
  });
});

function dateFromRange(dayIdx: number) {
  return new Date(dayIdx * 86_400_000);
}
