"use client";

import { useActionState, useState } from "react";

import { createEmployee, updateEmployee } from "@/app/actions/employees";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TagsInput } from "@/components/tags-input";
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
  position: string | null;
  skills: string[];
  role: "user" | "manager" | "admin";
};

type Props = (
  | { mode: "create"; trigger: React.ReactNode; employee?: undefined }
  | { mode: "edit"; trigger: React.ReactNode; employee: Employee }
) & { allSkills?: string[] };

export function EmployeeFormDialog({
  mode,
  trigger,
  employee,
  allSkills = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createEmployee : updateEmployee;
  const [state, formAction, pending] = useActionState(action, undefined);

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
        <form key={String(open)} action={formAction} className="flex flex-col gap-4">
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
              {state?.errors?.email && (
                <p className="text-sm text-destructive">{state.errors.email[0]}</p>
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
              {state?.errors?.firstName && (
                <p className="text-sm text-destructive">{state.errors.firstName[0]}</p>
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
              {state?.errors?.lastName && (
                <p className="text-sm text-destructive">{state.errors.lastName[0]}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="position">Stanowisko</Label>
            <Input
              id="position"
              name="position"
              placeholder="np. Frontend Developer"
              defaultValue={employee?.position ?? ""}
              required
            />
            {state?.errors?.position && (
              <p className="text-sm text-destructive">{state.errors.position[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="skills">Kompetencje / narzędzia</Label>
            <TagsInput
              name="skills"
              defaultValue={employee?.skills ?? []}
              suggestions={allSkills}
              placeholder="np. React, Figma, SQL — Enter dodaje"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Rola</Label>
            <Select name="role" defaultValue={employee?.role ?? "user"}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Użytkownik (ograniczony dostęp)</SelectItem>
                <SelectItem value="manager">Menedżer (projekty i zasoby)</SelectItem>
                <SelectItem value="admin">Administrator (pełny dostęp)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state?.message && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
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
