import { describe, expect, it } from "vitest";

import { can, capabilitiesOf, CAPABILITIES, ROLES, type Role } from "./permissions";

describe("macierz uprawnień", () => {
  it("każda rola ma zdefiniowany zestaw uprawnień", () => {
    for (const role of ROLES) {
      expect(Array.isArray(capabilitiesOf(role))).toBe(true);
    }
  });

  it("administrator ma wszystkie uprawnienia", () => {
    for (const cap of CAPABILITIES) {
      expect(can("admin", cap)).toBe(true);
    }
  });

  it("pracownik widzi tylko własne zaangażowanie", () => {
    expect(capabilitiesOf("user")).toEqual(["viewOwnAssignments"]);
  });

  it("menedżer planuje, ale nie zarządza kontami, słownikami ani stawkami", () => {
    expect(can("manager", "manageProjects")).toBe(true);
    expect(can("manager", "manageStaffing")).toBe(true);
    expect(can("manager", "viewResources")).toBe(true);
    expect(can("manager", "manageEmployees")).toBe(false);
    expect(can("manager", "manageDictionaries")).toBe(false);
    expect(can("manager", "viewRates")).toBe(false);
  });

  it("administracja wpisuje stawki i słowniki, ale nie planuje projektów", () => {
    expect(can("finance", "manageRates")).toBe(true);
    expect(can("finance", "manageDictionaries")).toBe(true);
    expect(can("finance", "manageProjects")).toBe(false);
    expect(can("finance", "manageStaffing")).toBe(false);
  });

  it("stawek nie widzi nikt poza administracją i administratorem", () => {
    const widzacy = ROLES.filter((r) => can(r, "viewRates"));
    expect(widzacy).toEqual(["finance", "admin"]);
  });

  it("dane kosztowe są zamknięte dla menedżera i pracownika", () => {
    for (const role of ["user", "manager"] as Role[]) {
      expect(can(role, "viewRates")).toBe(false);
      expect(can(role, "manageRates")).toBe(false);
    }
  });
});
