"use client";

import { useActionState, useState } from "react";

import { createProjectRole, updateProjectRole } from "@/app/actions/staffing";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PositionPicker } from "@/components/position-picker";
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

type Role = {
  id: string;
  positionId: string;
  startDate: string;
  endDate: string;
  requiredFte: string;
  requiredPeople: string;
};

type Props = (
  | { mode: "create"; projectId: string; role?: undefined }
  | { mode: "edit"; role: Role; projectId?: undefined }
) & { trigger: React.ReactNode; positions: { id: string; name: string }[] };

export function RoleFormDialog(props: Props) {
  const { mode, trigger, positions } = props;
  const [open, setOpen] = useState(false);
  const action =
    mode === "create"
      ? createProjectRole.bind(null, props.projectId)
      : updateProjectRole;
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionEffect(state, (s) => {
    if (s?.success && open) setOpen(false);
  });

  const role = mode === "edit" ? props.role : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Dodaj rolę" : "Edytuj rolę"}
          </DialogTitle>
          <DialogDescription>
            Zapotrzebowanie na stanowisko w projekcie (okres i wymagane FTE).
          </DialogDescription>
        </DialogHeader>

        <form key={String(open)} action={formAction} className="flex flex-col gap-4">
          {mode === "edit" && <input type="hidden" name="id" value={role!.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="positionId">Stanowisko / rola</Label>
            <PositionPicker
              id="positionId"
              name="positionId"
              positions={positions}
              defaultValue={role?.positionId}
            />
            {state?.errors?.positionId && (
              <p className="text-sm text-destructive">{state.errors.positionId[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Od (dzień)</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={role?.startDate}
                required
              />
              {state?.errors?.startDate && (
                <p className="text-sm text-destructive">{state.errors.startDate[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">Do (dzień)</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={role?.endDate}
                required
              />
              {state?.errors?.endDate && (
                <p className="text-sm text-destructive">{state.errors.endDate[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="requiredFte">Wymagane FTE</Label>
            <Input
              id="requiredFte"
              name="requiredFte"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={role?.requiredFte}
              placeholder="np. 1.00"
              required
            />
            {state?.errors?.requiredFte && (
              <p className="text-sm text-destructive">{state.errors.requiredFte[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="requiredPeople">Liczba osób</Label>
            <Input
              id="requiredPeople"
              name="requiredPeople"
              type="number"
              step="1"
              min="1"
              defaultValue={role?.requiredPeople ?? ""}
              placeholder="np. 2"
            />
            {state?.errors?.requiredPeople && (
              <p className="text-sm text-destructive">
                {state.errors.requiredPeople[0]}
              </p>
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
              {pending ? "Zapisywanie…" : mode === "create" ? "Dodaj rolę" : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
