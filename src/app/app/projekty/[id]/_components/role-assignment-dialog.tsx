"use client";

import { useState } from "react";

import { useActionForm, useFreshState } from "@/lib/hooks/use-action-form";
import { createOrUpdateAssignment } from "@/app/actions/staffing";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  firstName: string;
  lastName: string;
  skills: string[];
};
type Assignment = {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  fte: string;
};

export function RoleAssignmentDialog({
  projectRoleId,
  employees,
  assignment,
  trigger,
  defaultRange,
}: {
  projectRoleId: string;
  employees: Employee[];
  assignment?: Assignment;
  trigger: React.ReactNode;
  defaultRange?: { startDate: string; endDate: string };
}) {
  const [open, setOpen] = useState(false);
  const action = createOrUpdateAssignment.bind(
    null,
    projectRoleId,
    assignment?.id ?? null
  );
  const [state, formAction, pending] = useActionForm(action, undefined);
  // Błędy z poprzedniego otwarcia dialogu nie powinny wisieć nad nowym formularzem.
  const shown = useFreshState(state, open);

  useActionEffect(state, (s) => {
    if (s?.success && open) setOpen(false);
  });

  // Lista wyboru zawiera tylko aktywnych pracowników. Przydział osoby, która
  // odeszła (albo została zanonimizowana), musi mimo to pokazać i zachować
  // jej wybór — inaczej zapis po cichu przepisałby historię na kogoś innego.
  const currentIsListed =
    !assignment || employees.some((e) => e.id === assignment.userId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {assignment ? "Edytuj obsadę" : "Przypisz osobę"}
          </DialogTitle>
          <DialogDescription>
            Osoba, okres zaangażowania i FTE na tej roli.
          </DialogDescription>
        </DialogHeader>

        <form key={String(open)} onSubmit={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`userId-${projectRoleId}`}>Pracownik</Label>
            <Select name="userId" defaultValue={assignment?.userId}>
              <SelectTrigger id={`userId-${projectRoleId}`} className="w-full">
                <SelectValue placeholder="Wybierz pracownika" />
              </SelectTrigger>
              <SelectContent>
                {!currentIsListed && (
                  <SelectItem value={assignment.userId}>
                    {assignment.userName} (nieaktywny)
                  </SelectItem>
                )}
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="flex flex-col">
                      <span>
                        {e.firstName} {e.lastName}
                      </span>
                      {e.skills.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {e.skills.join(", ")}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {shown?.errors?.userId && (
              <p className="text-sm text-destructive">{shown.errors.userId[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`startDate-${projectRoleId}`}>Od (dzień)</Label>
              <Input
                id={`startDate-${projectRoleId}`}
                name="startDate"
                type="date"
                defaultValue={assignment?.startDate ?? defaultRange?.startDate}
                required
              />
              {shown?.errors?.startDate && (
                <p className="text-sm text-destructive">{shown.errors.startDate[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`endDate-${projectRoleId}`}>Do (dzień)</Label>
              <Input
                id={`endDate-${projectRoleId}`}
                name="endDate"
                type="date"
                defaultValue={assignment?.endDate ?? defaultRange?.endDate}
                required
              />
              {shown?.errors?.endDate && (
                <p className="text-sm text-destructive">{shown.errors.endDate[0]}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`fte-${projectRoleId}`}>FTE</Label>
            <Input
              id={`fte-${projectRoleId}`}
              name="fte"
              type="number"
              step="0.01"
              min="0.01"
              max="1"
              defaultValue={assignment?.fte}
              placeholder="0.70"
              required
            />
            {shown?.errors?.fte && (
              <p className="text-sm text-destructive">{shown.errors.fte[0]}</p>
            )}
          </div>

          {shown?.message && (
            <Alert variant="destructive">
              <AlertDescription>{shown.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Zapisywanie…" : assignment ? "Zapisz zmiany" : "Przypisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
