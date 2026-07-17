import { describe, expect, it } from "vitest";

import {
  moveDatesToMonth,
  monthRange,
  projectAnchorMonth,
  ym,
} from "./timeline";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("projectAnchorMonth", () => {
  it("kotwiczy na starcie, a przy jego braku na końcu", () => {
    expect(projectAnchorMonth(d("2026-07-13"), d("2026-08-10"))).toBe("2026-07");
    expect(projectAnchorMonth(null, d("2026-08-10"))).toBe("2026-08");
    expect(projectAnchorMonth(null, null)).toBeNull();
  });
});

describe("moveDatesToMonth", () => {
  it("przesuwa obie daty o tę samą liczbę miesięcy (zachowuje czas trwania)", () => {
    const res = moveDatesToMonth(d("2026-07-13"), d("2026-08-10"), "2026-10");
    expect(ym(res.startDate!)).toBe("2026-10");
    expect(ym(res.endDate!)).toBe("2026-11"); // start +3 mies. → koniec też +3
    expect(res.endDate!.getUTCDate()).toBe(10); // dzień zachowany
  });

  it("działa wstecz (na wcześniejszy miesiąc)", () => {
    const res = moveDatesToMonth(d("2026-07-01"), null, "2026-05");
    expect(ym(res.startDate!)).toBe("2026-05");
    expect(res.endDate).toBeNull();
  });

  it("projekt bez dat → ustawia start na 1. dzień docelowego miesiąca", () => {
    const res = moveDatesToMonth(null, null, "2026-09");
    expect(ym(res.startDate!)).toBe("2026-09");
    expect(res.startDate!.getUTCDate()).toBe(1);
    expect(res.endDate).toBeNull();
  });

  it("przeciągnięcie na ten sam miesiąc nic nie zmienia", () => {
    const res = moveDatesToMonth(d("2026-07-13"), d("2026-08-10"), "2026-07");
    expect(ym(res.startDate!)).toBe("2026-07");
    expect(ym(res.endDate!)).toBe("2026-08");
  });
});

describe("monthRange", () => {
  it("jest ciągły, z paddingiem i minimalną szerokością", () => {
    const range = monthRange(["2026-07"], "2026-07", 12);
    expect(range.length).toBeGreaterThanOrEqual(12);
    // ciągłość: kolejne miesiące bez dziur
    for (let i = 1; i < range.length; i++) {
      const [y0, m0] = range[i - 1].split("-").map(Number);
      const [y1, m1] = range[i].split("-").map(Number);
      expect(y1 * 12 + m1 - (y0 * 12 + m0)).toBe(1);
    }
    expect(range).toContain("2026-07");
  });

  it("obejmuje rozpiętość od najwcześniejszego do najpóźniejszego miesiąca", () => {
    const range = monthRange(["2026-03", "2027-01"], "2026-07", 6);
    expect(range).toContain("2026-03");
    expect(range).toContain("2027-01");
    expect(range[0] < "2026-03").toBe(true); // padding z przodu
  });
});
