"use client";

import { useState } from "react";

import { useActionForm, useFreshState } from "@/lib/hooks/use-action-form";
import { createEmployee, updateEmployee } from "@/app/actions/employees";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { NO_POSITION } from "@/lib/validation/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DictChips } from "@/components/dict-chips";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Employee = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  positionId: string | null;
  skills: { id: string; name: string }[];
  role: "user" | "manager" | "finance" | "admin";
};

type Props = (
  | { mode: "create"; trigger: React.ReactNode; employee?: undefined }
  | { mode: "edit"; trigger: React.ReactNode; employee: Employee }
) & {
  positions: { id: string; name: string }[];
  skills: { id: string; name: string }[];
  /** Własne konto: roli nie zmienia się samemu (serwer i tak by to zignorował). */
  isSelf?: boolean;
};

export function EmployeeFormDialog({
  mode,
  trigger,
  employee,
  positions,
  skills,
  isSelf = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createEmployee : updateEmployee;
  const [state, formAction, pending] = useActionForm(action, undefined);
  // Błędy z poprzedniego otwarcia dialogu nie powinny wisieć nad nowym formularzem.
  const shown = useFreshState(state, open);

  useActionEffect(state, (s) => {
    if (s?.success && open) setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Dodaj pracownika" : "Edytuj pracownika"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Utwórz profil nowego pracownika w systemie."
              : "Zaktualizuj dane profilowe pracownika."}
          </DialogDescription>
        </DialogHeader>

        {/* Remount on open/close so uncontrolled inputs clear between submissions. */}
        <form key={String(open)} onSubmit={formAction} className="flex flex-col gap-4">
          {mode === "edit" && <input type="hidden" name="id" value={employee.id} />}

          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jan.kowalski@firma.pl"
                required
              />
              {shown?.errors?.email && (
                <p className="text-sm text-destructive">{shown.errors.email[0]}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">Imię</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={employee?.firstName}
                required
              />
              {shown?.errors?.firstName && (
                <p className="text-sm text-destructive">{shown.errors.firstName[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Nazwisko</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={employee?.lastName}
                required
              />
              {shown?.errors?.lastName && (
                <p className="text-sm text-destructive">{shown.errors.lastName[0]}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="positionId">Stanowisko</Label>
            <Select name="positionId" defaultValue={employee?.positionId ?? NO_POSITION}>
              <SelectTrigger id="positionId" className="w-full">
                <SelectValue placeholder="Wybierz stanowisko" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_POSITION}>— brak —</SelectItem>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Lista pochodzi ze słownika w Ustawieniach.
            </p>
            {shown?.errors?.positionId && (
              <p className="text-sm text-destructive">{shown.errors.positionId[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Kompetencje</Label>
            <DictChips
              name="skillIds"
              items={skills}
              defaultSelected={(employee?.skills ?? []).map((s) => s.id)}
              emptyHint="Słownik kompetencji jest pusty — dodaj pozycje w Ustawieniach."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Rola</Label>
            <Select name="role" defaultValue={employee?.role ?? "user"} disabled={isSelf}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Pracownik (tylko własne przydziały)</SelectItem>
                <SelectItem value="manager">Menedżer (projekty i zasoby)</SelectItem>
                <SelectItem value="finance">
                  Administracja (słowniki i stawki)
                </SelectItem>
                <SelectItem value="admin">Administrator (pełny dostęp)</SelectItem>
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                Własnej roli nie możesz zmienić — poproś o to innego administratora.
              </p>
            )}
          </div>

          {shown?.message && (
            <Alert variant="destructive">
              <AlertDescription>{shown.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Zapisywanie…"
                : mode === "create"
                  ? "Dodaj pracownika"
                  : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
