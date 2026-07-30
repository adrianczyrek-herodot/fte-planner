"use client";

import { Pencil, UserCheck, UserX } from "lucide-react";

import { setEmployeeStatus } from "@/app/actions/employees";
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

type Employee = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string | null;
  skills: string[];
  role: "user" | "manager" | "admin";
  status: "approved" | "inactive" | "pending";
};

export function EmployeeRowActions({
  employee,
  isCurrentUser,
  isLastActive,
  allSkills,
}: {
  employee: Employee;
  isCurrentUser: boolean;
  isLastActive: boolean;
  allSkills: string[];
}) {
  // Powody, dla których nie wolno dezaktywować — te same, których broni akcja
  // serwerowa. Blokujemy je w UI, żeby zamiast wyjątku (crash overlay) pokazać
  // czytelny komunikat.
  const blockReason = isCurrentUser
    ? "Nie możesz dezaktywować własnego konta"
    : isLastActive
      ? "Nie można dezaktywować ostatniego aktywnego pracownika"
      : null;
  return (
    <div className="flex items-center gap-1">
      <EmployeeFormDialog
        mode="edit"
        employee={employee}
        allSkills={allSkills}
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
    </div>
  );
}
