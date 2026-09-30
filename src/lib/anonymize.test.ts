import { describe, expect, it } from "vitest";

import {
  anonymizedIdentity,
  anonymousSuffix,
  isAnonymized,
} from "@/lib/anonymize";

const ID = "cmrj8pvad0001ycune0ni6o7n";

describe("anonymizedIdentity", () => {
  it("usuwa wszystkie dane identyfikujące", () => {
    const a = anonymizedIdentity(ID);

    expect(a.firstName).toBe("Pracownik");
    expect(a.lastName).toContain("anonimowy");
    expect(a.passwordHash).toBeNull();
    expect(a.name).toBeNull();
    expect(a.image).toBeNull();
    expect(a.emailVerified).toBeNull();
    expect(a.positionId).toBeNull();
  });

  it("nie zostawia w polach śladu po oryginalnych danych", () => {
    const a = anonymizedIdentity(ID);
    const wszystko = JSON.stringify(a).toLowerCase();

    for (const slad of ["nowak", "michał", "michal", "m.nowak", "test.com"]) {
      expect(wszystko).not.toContain(slad);
    }
  });

  it("buduje e-mail w domenie, która nigdy nie istnieje naprawdę", () => {
    // .invalid jest zarezerwowana przez RFC 2606 — nie da się tam wysłać maila.
    expect(anonymizedIdentity(ID).email).toMatch(/@usuniety\.invalid$/);
  });

  it("daje różnym osobom różne adresy, bo kolumna ma więzy UNIQUE", () => {
    const a = anonymizedIdentity("aaaa1111");
    const b = anonymizedIdentity("bbbb2222");
    expect(a.email).not.toBe(b.email);
  });

  it("jest deterministyczna dla tego samego id", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    expect(anonymizedIdentity(ID, now)).toEqual(anonymizedIdentity(ID, now));
  });

  it("gasi konto: status nieaktywny i brak hasła", () => {
    const a = anonymizedIdentity(ID);
    expect(a.status).toBe("inactive");
    expect(a.passwordHash).toBeNull();
  });

  it("zapisuje moment anonimizacji", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    expect(anonymizedIdentity(ID, now).anonymizedAt).toEqual(now);
  });
});

describe("anonymousSuffix", () => {
  it("odróżnia rekordy od siebie, nie niosąc informacji o człowieku", () => {
    expect(anonymousSuffix("aaaa1111")).toBe("1111");
    expect(anonymousSuffix("bbbb2222")).toBe("2222");
  });

  it("dwie zanonimizowane osoby mają różne nazwiska", () => {
    const a = anonymizedIdentity("aaaa1111").lastName;
    const b = anonymizedIdentity("bbbb2222").lastName;
    expect(a).not.toBe(b);
  });
});

describe("isAnonymized", () => {
  it("rozpoznaje rekord zanonimizowany i zwykły", () => {
    expect(isAnonymized({ anonymizedAt: new Date() })).toBe(true);
    expect(isAnonymized({ anonymizedAt: null })).toBe(false);
  });
});
