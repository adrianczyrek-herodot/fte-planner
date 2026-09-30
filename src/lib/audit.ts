// Dziennik zdarzeń — warstwa czysta. Etykiety i budowanie wpisów bez dotykania
// bazy, żeby dało się je pokryć testami jednostkowymi.
//
// Logujemy wyłącznie operacje nieodwracalne albo zmieniające czyjeś
// uprawnienia. Dziennik, w którym jest wszystko, nie odpowiada na pytanie „kto
// skasował dane tej osoby" — trzeba go najpierw przekopać.

import { roleLabels, type Role } from "@/lib/permissions";

export const AUDIT_ACTIONS = [
  "employee_anonymized",
  "employee_deactivated",
  "employee_activated",
  "employee_role_changed",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditActionLabels: Record<AuditAction, string> = {
  employee_anonymized: "Usunięcie danych osobowych",
  employee_deactivated: "Dezaktywacja konta",
  employee_activated: "Aktywacja konta",
  employee_role_changed: "Zmiana roli",
};

/** Czy zdarzenie jest nieodwracalne — interfejs wyróżnia je wizualnie. */
export function isIrreversible(action: AuditAction): boolean {
  return action === "employee_anonymized";
}

export type AuditEntry = {
  actorId: string | null;
  action: AuditAction;
  targetUserId: string | null;
  details: string | null;
};

/**
 * Buduje wpis do zapisania. Celowo przyjmuje wyłącznie identyfikatory — gdyby
 * dało się tu podać imię czy e-mail, prędzej czy później ktoś by to zrobił, a
 * dane osobowe przeżyłyby anonimizację ukryte w dzienniku.
 */
export function auditEntry(input: {
  actorId: string | null;
  action: AuditAction;
  targetUserId?: string | null;
  details?: string | null;
}): AuditEntry {
  return {
    actorId: input.actorId,
    action: input.action,
    targetUserId: input.targetUserId ?? null,
    details: input.details ?? null,
  };
}

/** Opis zmiany roli — czytelny, bez danych osobowych. */
export function roleChangeDetails(from: Role, to: Role): string {
  return `rola: ${roleLabels[from]} → ${roleLabels[to]}`;
}

/** Zdarzenie wynikające ze zmiany statusu konta. */
export function statusChangeAction(
  status: "approved" | "inactive"
): Extract<AuditAction, "employee_activated" | "employee_deactivated"> {
  return status === "approved" ? "employee_activated" : "employee_deactivated";
}
