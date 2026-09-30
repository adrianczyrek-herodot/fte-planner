"use client";

import { Eraser, Pencil, UserCheck, UserX } from "lucide-react";

import { anonymizeEmployee, setEmployeeStatus } from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmployeeFormDialog } from "./employee-form-dialog";

type DictItem = { id: string; name: string };

type Employee = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  positionId: string | null;
  skills: DictItem[];
  role: "user" | "manager" | "finance" | "admin";
  status: "approved" | "inactive" | "pending";
  anonymizedAt: Date | null;
};

export function EmployeeRowActions({
  employee,
  isCurrentUser,
  isLastActive,
  positions,
  skills,
}: {
  employee: Employee;
  isCurrentUser: boolean;
  isLastActive: boolean;
  positions: DictItem[];
  skills: DictItem[];
}) {
  // Powody, dla których nie wolno dezaktywować — te same, których broni akcja
  // serwerowa. Blokujemy je w UI, żeby zamiast wyjątku (crash overlay) pokazać
  // czytelny komunikat.
  const blockReason = isCurrentUser
    ? "Nie możesz dezaktywować własnego konta"
    : isLastActive
      ? "Nie można dezaktywować ostatniego aktywnego pracownika"
      : null;

  // Po anonimizacji nie ma już czego edytować ani komu przywracać dostępu —
  // rekord jest tylko nośnikiem historii obsady. Zostawienie czynnych
  // przycisków sugerowałoby, że operację da się cofnąć.
  if (employee.anonymizedAt) {
    return (
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        Dane usunięte
      </span>
    );
  }

  const anonimizacjaBlokada = isCurrentUser
    ? "Nie możesz zanonimizować własnego konta"
    : isLastActive
      ? "Nie można zanonimizować ostatniego aktywnego pracownika"
      : null;

  return (
    <div className="flex items-center gap-1">
      <EmployeeFormDialog
        mode="edit"
        employee={employee}
        positions={positions}
        skills={skills}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Edytuj pracownika">
            <Pencil />
          </Button>
        }
      />

      {employee.status !== "approved" ? (
        <form action={setEmployeeStatus}>
          <input type="hidden" name="id" value={employee.id} />
          <input type="hidden" name="status" value="approved" />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label={
              employee.status === "pending"
                ? "Zatwierdź pracownika"
                : "Aktywuj pracownika"
            }
            title={
              employee.status === "pending"
                ? "Zatwierdź dostęp"
                : "Aktywuj pracownika"
            }
          >
            <UserCheck />
          </Button>
        </form>
      ) : blockReason ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={blockReason}
          title={blockReason}
          disabled
        >
          <UserX />
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Dezaktywuj pracownika"
            >
              <UserX />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Dezaktywować pracownika?</AlertDialogTitle>
              <AlertDialogDescription>
                {employee.firstName} {employee.lastName} straci dostęp do logowania.
                Możesz go później ponownie aktywować.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <form action={setEmployeeStatus}>
                <input type="hidden" name="id" value={employee.id} />
                <input type="hidden" name="status" value="inactive" />
                <AlertDialogAction type="submit" variant="destructive">
                  Dezaktywuj
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {anonimizacjaBlokada ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={anonimizacjaBlokada}
          title={anonimizacjaBlokada}
          disabled
        >
          <Eraser />
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Usuń dane osobowe pracownika"
              title="Usuń dane osobowe (RODO)"
            >
              <Eraser />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Trwale usunąć dane osobowe?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    Imię, nazwisko, e-mail, hasło, stanowisko i kompetencje osoby{" "}
                    <strong>
                      {employee.firstName} {employee.lastName}
                    </strong>{" "}
                    zostaną nadpisane. Sesje i dostęp do logowania znikną
                    natychmiast.
                  </p>
                  <p>
                    Przydziały do projektów i wyliczone koszty zostaną
                    zachowane, ale jako anonimowy rekord — bez tego rozsypałaby
                    się historia obsady projektów.
                  </p>
                  <p className="font-medium text-destructive">
                    Tej operacji nie da się cofnąć.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <form action={anonymizeEmployee}>
                <input type="hidden" name="id" value={employee.id} />
                <AlertDialogAction type="submit" variant="destructive">
                  Usuń dane
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
