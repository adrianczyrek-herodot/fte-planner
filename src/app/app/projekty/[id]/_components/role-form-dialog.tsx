"use client";

import { useActionState, useState } from "react";

import { createProjectRole, updateProjectRole } from "@/app/actions/staffing";
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

type Role = {
  id: string;
  position: string;
  startMonth: string;
  endMonth: string;
  requiredFte: string;
};

type Props =
  | { mode: "create"; projectId: string; trigger: React.ReactNode; role?: undefined }
  | { mode: "edit"; role: Role; trigger: React.ReactNode; projectId?: undefined };

export function RoleFormDialog(props: Props) {
  const { mode, trigger } = props;
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
            <Label htmlFor="position">Stanowisko / rola</Label>
            <Input
              id="position"
              name="position"
              defaultValue={role?.position}
              placeholder="np. Frontend Developer"
              required
            />
            {state?.errors?.position && (
              <p className="text-sm text-destructive">{state.errors.position[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startMonth">Od (miesiąc)</Label>
              <Input
                id="startMonth"
                name="startMonth"
                type="month"
                defaultValue={role?.startMonth}
                required
              />
              {state?.errors?.startMonth && (
                <p className="text-sm text-destructive">{state.errors.startMonth[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endMonth">Do (miesiąc)</Label>
              <Input
                id="endMonth"
                name="endMonth"
                type="month"
                defaultValue={role?.endMonth}
                required
              />
              {state?.errors?.endMonth && (
                <p className="text-sm text-destructive">{state.errors.endMonth[0]}</p>
              )}
            </div>
          </div>

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
