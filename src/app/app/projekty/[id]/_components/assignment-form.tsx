"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";

import { createOrUpdateAssignment } from "@/app/actions/assignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Employee = { id: string; firstName: string; lastName: string };

export function AssignmentForm({
  projectId,
  employees,
}: {
  projectId: string;
  employees: Employee[];
}) {
  const action = createOrUpdateAssignment.bind(null, projectId, null);
  const [state, formAction, pending] = useActionState(action, undefined);

  // Reset formularza po udanym zapisie (ten sam wzorzec co przy załącznikach).
  const [formKey, setFormKey] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.success) {
      setFormKey((key) => key + 1);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        key={formKey}
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
      >
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="userId">Pracownik</Label>
          <Select name="userId">
            <SelectTrigger id="userId" className="w-full">
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="month">Miesiąc</Label>
          <Input id="month" name="month" type="month" required />
          {state?.errors?.month && (
            <p className="text-sm text-destructive">{state.errors.month[0]}</p>
          )}
        </div>

        <div className="flex w-28 flex-col gap-2">
          <Label htmlFor="fte">FTE</Label>
          <Input
            id="fte"
            name="fte"
            type="number"
            step="0.01"
            min="0.01"
            max="1"
            placeholder="0.70"
            required
          />
          {state?.errors?.fte && (
            <p className="text-sm text-destructive">{state.errors.fte[0]}</p>
          )}
        </div>

        <Button type="submit" disabled={pending}>
          <UserPlus />
          {pending ? "Zapisywanie…" : "Przydziel"}
        </Button>
      </form>

      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state?.success && state.conflict && (
        <Alert variant="destructive">
          <AlertDescription>
            Zapisano, ale suma FTE tego pracownika w wybranym miesiącu przekracza
            1.00 — przydziały oznaczono jako konfliktowe.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
