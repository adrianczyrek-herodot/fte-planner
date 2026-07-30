"use client";

import { useActionState, useState } from "react";

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
  startMonth: string;
  endMonth: string;
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
  defaultRange?: { startMonth: string; endMonth: string };
}) {
  const [open, setOpen] = useState(false);
  const action = createOrUpdateAssignment.bind(
    null,
    projectRoleId,
    assignment?.id ?? null
  );
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
            {assignment ? "Edytuj obsadę" : "Przypisz osobę"}
          </DialogTitle>
          <DialogDescription>
            Osoba, okres zaangażowania i FTE na tej roli.
          </DialogDescription>
        </DialogHeader>

        <form key={String(open)} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`userId-${projectRoleId}`}>Pracownik</Label>
            <Select name="userId" defaultValue={assignment?.userId}>
              <SelectTrigger id={`userId-${projectRoleId}`} className="w-full">
                <SelectValue placeholder="Wybierz pracownika" />
              </SelectTrigger>
              <SelectContent>
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
            {state?.errors?.userId && (
              <p className="text-sm text-destructive">{state.errors.userId[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`startMonth-${projectRoleId}`}>Od (miesiąc)</Label>
              <Input
                id={`startMonth-${projectRoleId}`}
                name="startMonth"
                type="month"
                defaultValue={assignment?.startMonth ?? defaultRange?.startMonth}
                required
              />
              {state?.errors?.startMonth && (
                <p className="text-sm text-destructive">{state.errors.startMonth[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`endMonth-${projectRoleId}`}>Do (miesiąc)</Label>
              <Input
                id={`endMonth-${projectRoleId}`}
                name="endMonth"
                type="month"
                defaultValue={assignment?.endMonth ?? defaultRange?.endMonth}
                required
              />
              {state?.errors?.endMonth && (
                <p className="text-sm text-destructive">{state.errors.endMonth[0]}</p>
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
            {state?.errors?.fte && (
              <p className="text-sm text-destructive">{state.errors.fte[0]}</p>
            )}
          </div>

          {state?.message && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
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
