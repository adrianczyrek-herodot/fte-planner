import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";

import { deleteAssignment, deleteProjectRole } from "@/app/actions/staffing";
import { formatMonthLabel } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleFormDialog } from "./role-form-dialog";
import { RoleAssignmentDialog } from "./role-assignment-dialog";

type Assignment = {
  id: string;
  userId: string;
  name: string;
  startMonth: string;
  endMonth: string;
  fte: string;
  isConflict: boolean;
};

type Coverage = { month: string; required: number; assigned: number; gap: number };

type Role = {
  id: string;
  position: string;
  startMonth: string;
  endMonth: string;
  requiredFte: string;
  hasGap: boolean;
  coverage: Coverage[];
  assignments: Assignment[];
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
}: {
  projectId: string;
  roles: Role[];
  employees: Employee[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Zapotrzebowanie na role</h2>
        <RoleFormDialog
          mode="create"
          projectId={projectId}
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
                    {role.startMonth} – {role.endMonth} · {fmt(role.requiredFte)} FTE
                  </span>
                  <Badge variant={role.hasGap ? "destructive" : "secondary"}>
                    {role.hasGap ? "Niedobór" : "Obsadzone"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <RoleFormDialog
                    mode="edit"
                    role={{
                      id: role.id,
                      position: role.position,
                      startMonth: role.startMonth,
                      endMonth: role.endMonth,
                      requiredFte: role.requiredFte,
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
                    title={`${formatMonthLabel(c.month)}: obsada ${fmt(c.assigned)} / wymagane ${fmt(c.required)}`}
                    className={cn(
                      "flex min-w-16 shrink-0 flex-col items-center rounded-md px-2 py-1 text-xs",
                      c.gap > 0
                        ? "bg-destructive/10 text-destructive"
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
                          {a.startMonth} – {a.endMonth}
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
                            startMonth: a.startMonth,
                            endMonth: a.endMonth,
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
                  defaultRange={{ startMonth: role.startMonth, endMonth: role.endMonth }}
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
