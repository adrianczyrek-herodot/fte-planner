"use client";

// Komponent kliencki celowo, mimo że sam nie trzyma stanu. Gdy był serwerowy,
// elementy `trigger` (przyciski dialogów) przekraczały granicę RSC i trafiały
// do Radix jako nierozwiązane, leniwe referencje — przy części twardych
// ładowań Slot nie potrafił się na nich osadzić i strona kończyła się błędem
// "Primitive.button failed to slot onto its children". Trzymanie całego
// poddrzewa po stronie klienta usuwa tę granicę.
import { Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";

import { deleteAssignment, deleteProjectRole } from "@/app/actions/staffing";
import { formatMonthLabel, formatYmdRange } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/info-hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleFormDialog } from "./role-form-dialog";
import { RoleAssignmentDialog } from "./role-assignment-dialog";

type Assignment = {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  fte: string;
  isConflict: boolean;
};

type Coverage = {
  month: string;
  required: number;
  assigned: number;
  gap: number;
  surplus: number;
};

type Role = {
  id: string;
  position: string;
  startDate: string;
  endDate: string;
  positionId: string;
  requiredFte: string;
  requiredPeople: string;
  people: { required: number | null; assigned: number; status: "unset" | "fewer" | "exact" | "more" };
  coverage: Coverage[];
  /** Pokrycie całego okresu roli w procentach. */
  percent: number;
  status: "gap" | "exact" | "surplus";
  /** Oba mogą być prawdą naraz: dziura w jednym miesiącu, nadmiar w innym. */
  hasGap: boolean;
  hasSurplus: boolean;
  assignments: Assignment[];
};

// Plakietka pokrycia: stan + procent, bo sam procent nie wystarcza. Rola
// obsadzona 1.5 / 0 / 1.5 w trzech miesiącach ma 100% i jednocześnie dziurę.
const statusMeta = {
  gap: { label: "Niedobór", variant: "destructive" as const },
  exact: { label: "Pokryte", variant: "secondary" as const },
  surplus: { label: "Nadmiar", variant: "warning" as const },
};

// Liczba osób jest pilnowana obok FTE: 2.0 FTE można obsadzić dwiema osobami
// na całość albo czterema na pół etatu — to nie to samo zapotrzebowanie.
const peopleMeta = {
  fewer: { variant: "destructive" as const, hint: "za mało osób" },
  exact: { variant: "secondary" as const, hint: "liczba osób zgodna" },
  more: { variant: "warning" as const, hint: "więcej osób niż zaplanowano" },
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  skills: string[];
};

const fmt = (v: number | string) => String(Number(Number(v).toFixed(2)));

export function StaffingSection({
  projectId,
  roles,
  employees,
  positions,
}: {
  projectId: string;
  roles: Role[];
  employees: Employee[];
  positions: { id: string; name: string }[];
}) {
  return (
    <div data-section="staffing" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Zapotrzebowanie na role</h2>
        <RoleFormDialog
          mode="create"
          projectId={projectId}
          positions={positions}
          trigger={
            <Button size="sm">
              <Plus />
              Dodaj rolę
            </Button>
          }
        />
      </div>

      {roles.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Brak zdefiniowanych ról. Dodaj pierwszą, aby zaplanować obsadę.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <div key={role.id} className="rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{role.position}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatYmdRange(role.startDate, role.endDate)} · {fmt(role.requiredFte)} FTE
                  </span>
                  <Badge
                    variant={statusMeta[role.status].variant}
                    title={`Pokrycie całego okresu roli: ${role.percent}%`}
                  >
                    {statusMeta[role.status].label}
                    <span className="tabular-nums"> · {role.percent}%</span>
                  </Badge>
                  {role.people.status !== "unset" && (
                    <Badge
                      variant={peopleMeta[role.people.status].variant}
                      title={`Osoby na roli: ${peopleMeta[role.people.status].hint}`}
                    >
                      <Users className="size-3" />
                      <span className="tabular-nums">
                        {role.people.assigned}/{role.people.required}
                      </span>
                    </Badge>
                  )}
                  <InfoHint label="Jak liczymy pokrycie roli">
                    Procent to suma obsadzonego FTE podzielona przez sumę
                    zapotrzebowania, po wszystkich miesiącach roli łącznie.
                    Etykieta patrzy jednak na pojedyncze miesiące: „Niedobór”
                    pojawia się, gdy brakuje obsady w którymkolwiek z nich.
                    Dlatego rola może mieć 100% i nadal być oznaczona jako
                    niedobór — jeden miesiąc obsadzony z nadmiarem nie zasypuje
                    luki w innym. Licznik osób to unikalni ludzie w całym okresie
                    roli, a nie obsada konkretnego miesiąca.
                  </InfoHint>
                  {role.people.status === "unset" && role.people.assigned > 0 && (
                    <Badge variant="outline" title="Nie zadeklarowano liczby osób">
                      <Users className="size-3" />
                      <span className="tabular-nums">{role.people.assigned}</span>
                    </Badge>
                  )}
                  {role.hasGap && role.hasSurplus && (
                    <span className="text-xs text-muted-foreground">
                      niedobór i nadmiar w różnych miesiącach
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <RoleFormDialog
                    mode="edit"
                    positions={positions}
                    role={{
                      id: role.id,
                      positionId: role.positionId,
                      startDate: role.startDate,
                      endDate: role.endDate,
                      requiredFte: role.requiredFte,
                      requiredPeople: role.requiredPeople,
                    }}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Edytuj rolę">
                        <Pencil />
                      </Button>
                    }
                  />
                  <form action={deleteProjectRole}>
                    <input type="hidden" name="id" value={role.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Usuń rolę"
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </form>
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b bg-muted/20 p-2">
                {role.coverage.map((c) => (
                  <div
                    key={c.month}
                    title={[
                      `${formatMonthLabel(c.month)}: obsada ${fmt(c.assigned)} / wymagane ${fmt(c.required)}`,
                      c.gap > 0 ? `brakuje ${fmt(c.gap)} FTE` : null,
                      c.surplus > 0 ? `nadmiar ${fmt(c.surplus)} FTE` : null,
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                    className={cn(
                      "flex min-w-16 shrink-0 flex-col items-center rounded-md px-2 py-1 text-xs",
                      c.gap > 0
                        ? "bg-destructive/10 text-destructive"
                        : c.surplus > 0
                          ? "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400"
                          : "bg-primary/10 text-primary"
                    )}
                  >
                    <span className="capitalize text-muted-foreground">
                      {formatMonthLabel(c.month)}
                    </span>
                    <span className="font-medium tabular-nums">
                      {fmt(c.assigned)}/{fmt(c.required)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col divide-y">
                {role.assignments.length === 0 ? (
                  <p className="px-3 py-2.5 text-sm text-muted-foreground">
                    Brak obsady.
                  </p>
                ) : (
                  role.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatYmdRange(a.startDate, a.endDate)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant={a.isConflict ? "destructive" : "secondary"}>
                          {fmt(a.fte)} FTE
                        </Badge>
                        <RoleAssignmentDialog
                          projectRoleId={role.id}
                          employees={employees}
                          assignment={{
                            id: a.id,
                            userId: a.userId,
                            userName: a.name,
                            startDate: a.startDate,
                            endDate: a.endDate,
                            fte: a.fte,
                          }}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edytuj obsadę"
                            >
                              <Pencil />
                            </Button>
                          }
                        />
                        <form action={deleteAssignment}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Usuń obsadę"
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t p-2">
                <RoleAssignmentDialog
                  projectRoleId={role.id}
                  employees={employees}
                  defaultRange={{ startDate: role.startDate, endDate: role.endDate }}
                  trigger={
                    <Button variant="ghost" size="sm">
                      <UserPlus />
                      Przypisz osobę
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
