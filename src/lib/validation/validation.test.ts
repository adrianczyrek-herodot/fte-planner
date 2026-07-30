import { describe, expect, it } from "vitest";

import { LoginFormSchema, SignupFormSchema } from "@/lib/validation/auth";
import {
  EmployeeCreateSchema,
  EmployeeUpdateSchema,
} from "@/lib/validation/employee";
import { ProjectSchema } from "@/lib/validation/project";
import { AssignmentSchema } from "@/lib/validation/staffing";
import {
  RequestResetSchema,
  SetPasswordSchema,
} from "@/lib/validation/password";

describe("SignupFormSchema", () => {
  const base = {
    firstName: "Jan",
    lastName: "Kowalski",
    email: "jan@firma.pl",
    password: "haslo123",
  };

  it("akceptuje poprawne dane", () => {
    expect(SignupFormSchema.safeParse(base).success).toBe(true);
  });

  it("odrzuca hasło bez cyfry / bez litery / za krótkie", () => {
    expect(SignupFormSchema.safeParse({ ...base, password: "bezcyfry" }).success).toBe(false);
    expect(SignupFormSchema.safeParse({ ...base, password: "12345678" }).success).toBe(false);
    expect(SignupFormSchema.safeParse({ ...base, password: "abc1" }).success).toBe(false);
  });

  it("odrzuca zły e-mail i puste imię/nazwisko", () => {
    expect(SignupFormSchema.safeParse({ ...base, email: "niepoprawny" }).success).toBe(false);
    expect(SignupFormSchema.safeParse({ ...base, firstName: "   " }).success).toBe(false);
  });
});

describe("LoginFormSchema", () => {
  it("wymaga e-maila i niepustego hasła", () => {
    expect(LoginFormSchema.safeParse({ email: "a@b.pl", password: "x" }).success).toBe(true);
    expect(LoginFormSchema.safeParse({ email: "a@b.pl", password: "" }).success).toBe(false);
    expect(LoginFormSchema.safeParse({ email: "zły", password: "x" }).success).toBe(false);
  });
});

describe("Employee schemas", () => {
  it("create: wymaga e-maila, imienia, nazwiska, stanowiska", () => {
    expect(
      EmployeeCreateSchema.safeParse({
        email: "a@b.pl",
        firstName: "A",
        lastName: "B",
        position: "Dev",
      }).success
    ).toBe(true);
    expect(
      EmployeeCreateSchema.safeParse({
        email: "a@b.pl",
        firstName: "",
        lastName: "B",
        position: "Dev",
      }).success
    ).toBe(false);
  });

  it("update: wymaga id i pól profilowych (bez e-maila)", () => {
    expect(
      EmployeeUpdateSchema.safeParse({
        id: "abc",
        firstName: "A",
        lastName: "B",
        position: "Dev",
      }).success
    ).toBe(true);
    expect(
      EmployeeUpdateSchema.safeParse({
        id: "",
        firstName: "A",
        lastName: "B",
        position: "Dev",
      }).success
    ).toBe(false);
  });
});

describe("ProjectSchema", () => {
  it("wymaga nazwy; opis i daty opcjonalne", () => {
    expect(ProjectSchema.safeParse({ name: "X" }).success).toBe(true);
    expect(ProjectSchema.safeParse({ name: "  " }).success).toBe(false);
  });

  it("puste daty → null, poprawne daty → Date", () => {
    const empty = ProjectSchema.safeParse({ name: "X", startDate: "", endDate: "" });
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.startDate).toBeNull();
      expect(empty.data.endDate).toBeNull();
    }
    const dated = ProjectSchema.safeParse({ name: "X", startDate: "2026-07-13" });
    expect(dated.success).toBe(true);
    if (dated.success) expect(dated.data.startDate).toBeInstanceOf(Date);
  });

  it("śmieciowa data → błąd walidacji (nie crash)", () => {
    expect(ProjectSchema.safeParse({ name: "X", startDate: "trzynasty lipca" }).success).toBe(false);
  });

  it("odrzuca zakończenie wcześniejsze niż rozpoczęcie", () => {
    const bad = ProjectSchema.safeParse({
      name: "X",
      startDate: "2026-08-10",
      endDate: "2026-07-13",
    });
    expect(bad.success).toBe(false);
  });

  it("akceptuje start < end oraz start = end", () => {
    expect(
      ProjectSchema.safeParse({ name: "X", startDate: "2026-07-13", endDate: "2026-08-10" }).success
    ).toBe(true);
    expect(
      ProjectSchema.safeParse({ name: "X", startDate: "2026-07-13", endDate: "2026-07-13" }).success
    ).toBe(true);
  });

  it("nie wymusza kolejności, gdy podano tylko jedną datę", () => {
    expect(ProjectSchema.safeParse({ name: "X", startDate: "2026-07-13" }).success).toBe(true);
    expect(ProjectSchema.safeParse({ name: "X", endDate: "2026-07-13" }).success).toBe(true);
  });
});

describe("AssignmentSchema", () => {
  const base = {
    userId: "u1",
    startMonth: "2026-07",
    endMonth: "2026-09",
    fte: "0.7",
  };

  it("akceptuje poprawny przydział (okres)", () => {
    expect(AssignmentSchema.safeParse(base).success).toBe(true);
  });

  it("odrzuca FTE = 0, ujemne, > 1 oraz nie-liczbę", () => {
    expect(AssignmentSchema.safeParse({ ...base, fte: "0" }).success).toBe(false);
    expect(AssignmentSchema.safeParse({ ...base, fte: "-0.5" }).success).toBe(false);
    expect(AssignmentSchema.safeParse({ ...base, fte: "1.5" }).success).toBe(false);
    expect(AssignmentSchema.safeParse({ ...base, fte: "abc" }).success).toBe(false);
  });

  it("wymusza format miesięcy i kolejność (koniec ≥ start)", () => {
    expect(AssignmentSchema.safeParse({ ...base, startMonth: "2026-13" }).success).toBe(false);
    expect(AssignmentSchema.safeParse({ ...base, endMonth: "2026-06" }).success).toBe(false);
  });

  it("wymaga wybrania pracownika", () => {
    expect(AssignmentSchema.safeParse({ ...base, userId: "" }).success).toBe(false);
  });
});

describe("Password schemas", () => {
  it("set-password: wymaga zgodnych i mocnych haseł oraz tokenu", () => {
    expect(
      SetPasswordSchema.safeParse({
        token: "t",
        password: "haslo123",
        confirmPassword: "haslo123",
      }).success
    ).toBe(true);
    // niezgodne hasła
    expect(
      SetPasswordSchema.safeParse({
        token: "t",
        password: "haslo123",
        confirmPassword: "inne1234",
      }).success
    ).toBe(false);
    // brak tokenu
    expect(
      SetPasswordSchema.safeParse({
        token: "",
        password: "haslo123",
        confirmPassword: "haslo123",
      }).success
    ).toBe(false);
  });

  it("request-reset: wymaga poprawnego e-maila", () => {
    expect(RequestResetSchema.safeParse({ email: "a@b.pl" }).success).toBe(true);
    expect(RequestResetSchema.safeParse({ email: "nie-email" }).success).toBe(false);
  });
});
