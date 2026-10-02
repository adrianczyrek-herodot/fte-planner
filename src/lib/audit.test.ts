import { describe, expect, it } from "vitest";

import {
  AUDIT_ACTIONS,
  auditActionLabels,
  auditEntry,
  isIrreversible,
  roleChangeDetails,
  statusChangeAction,
} from "@/lib/audit";

describe("auditEntry", () => {
  it("zapisuje wyłącznie identyfikatory, nigdy danych osobowych", () => {
    const wpis = auditEntry({
      actorId: "admin-1",
      action: "employee_anonymized",
      targetUserId: "user-2",
    });

    // Cały wpis nie może zawierać niczego, co identyfikuje człowieka — to jest
    // powód, dla którego funkcja nie przyjmuje imienia ani e-maila.
    expect(Object.keys(wpis).sort()).toEqual([
      "action",
      "actorId",
      "details",
      "targetUserId",
    ]);
    expect(wpis.details).toBeNull();
  });

  it("dopuszcza brak aktora (zdarzenie spoza sesji)", () => {
    expect(auditEntry({ actorId: null, action: "employee_activated" }).actorId).toBeNull();
  });
});

describe("etykiety", () => {
  it("każda akcja ma etykietę — inaczej dziennik pokazałby surowy enum", () => {
    for (const action of AUDIT_ACTIONS) {
      expect(auditActionLabels[action]).toBeTruthy();
    }
  });
});

describe("isIrreversible", () => {
  it("tylko anonimizacja jest nieodwracalna", () => {
    expect(isIrreversible("employee_anonymized")).toBe(true);
    expect(isIrreversible("employee_deactivated")).toBe(false);
    expect(isIrreversible("employee_activated")).toBe(false);
    expect(isIrreversible("employee_role_changed")).toBe(false);
  });
});

describe("roleChangeDetails", () => {
  it("opisuje zmianę czytelnie, po polsku", () => {
    expect(roleChangeDetails("user", "admin")).toBe("rola: pracownik → administrator");
  });

  it("nie przecieka żadnych danych osobowych", () => {
    expect(roleChangeDetails("manager", "finance")).not.toMatch(/@/);
  });
});

describe("statusChangeAction", () => {
  it("mapuje status na właściwe zdarzenie", () => {
    expect(statusChangeAction("approved")).toBe("employee_activated");
    expect(statusChangeAction("inactive")).toBe("employee_deactivated");
    expect(statusChangeAction("approved", "pending")).toBe("registration_approved");
    expect(statusChangeAction("approved", "inactive")).toBe("employee_activated");
  });
});
