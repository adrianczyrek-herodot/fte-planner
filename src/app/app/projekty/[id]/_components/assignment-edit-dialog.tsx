"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import { createOrUpdateAssignment } from "@/app/actions/assignments";
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

type Employee = { id: string; firstName: string; lastName: string };

type Assignment = {
  id: string;
  userId: string;
  month: string;
  fte: string;
};

export function AssignmentEditDialog({
  projectId,
  employees,
  assignment,
}: {
  projectId: string;
  employees: Employee[];
  assignment: Assignment;
}) {
  const [open, setOpen] = useState(false);
  const action = createOrUpdateAssignment.bind(null, projectId, assignment.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionEffect(state, (s) => {
    if (s?.success && open) setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edytuj przydział">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj przydział</DialogTitle>
          <DialogDescription>
            Zmień pracownika, miesiąc lub wartość FTE.
          </DialogDescription>
        </DialogHeader>

        <form
          key={String(open)}
          action={formAction}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`userId-${assignment.id}`}>Pracownik</Label>
            <Select name="userId" defaultValue={assignment.userId}>
              <SelectTrigger id={`userId-${assignment.id}`} className="w-full">
                <SelectValue placeholder="Wybierz pracownika" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
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
              <Label htmlFor={`month-${assignment.id}`}>Miesiąc</Label>
              <Input
                id={`month-${assignment.id}`}
                name="month"
                type="month"
                defaultValue={assignment.month}
                required
              />
              {state?.errors?.month && (
                <p className="text-sm text-destructive">{state.errors.month[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`fte-${assignment.id}`}>FTE</Label>
              <Input
                id={`fte-${assignment.id}`}
                name="fte"
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                defaultValue={assignment.fte}
                required
              />
              {state?.errors?.fte && (
                <p className="text-sm text-destructive">{state.errors.fte[0]}</p>
              )}
            </div>
          </div>

          {state?.message && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Zapisywanie…" : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
