"use client";

import { useActionState, useState } from "react";

import { createProject, updateProject } from "@/app/actions/projects";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type Project = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

type Props =
  | { mode: "create"; trigger: React.ReactNode; project?: undefined }
  | { mode: "edit"; trigger: React.ReactNode; project: Project };

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function ProjectFormDialog({ mode, trigger, project }: Props) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createProject : updateProject;
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
            {mode === "create" ? "Dodaj projekt" : "Edytuj projekt"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Utwórz nowy projekt w systemie."
              : "Zaktualizuj dane projektu."}
          </DialogDescription>
        </DialogHeader>

        {/* Remount on open/close so uncontrolled inputs clear between submissions. */}
        <form key={String(open)} action={formAction} className="flex flex-col gap-4">
          {mode === "edit" && <input type="hidden" name="id" value={project.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nazwa</Label>
            <Input
              id="name"
              name="name"
              defaultValue={project?.name}
              placeholder="np. Wdrożenie platformy X"
              required
            />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={project?.description ?? ""}
              placeholder="Krótki opis projektu"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Data rozpoczęcia</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={toDateInputValue(project?.startDate)}
              />
              {state?.errors?.startDate && (
                <p className="text-sm text-destructive">{state.errors.startDate[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">Data zakończenia</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={toDateInputValue(project?.endDate)}
              />
              {state?.errors?.endDate && (
                <p className="text-sm text-destructive">{state.errors.endDate[0]}</p>
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
              {pending
                ? "Zapisywanie…"
                : mode === "create"
                  ? "Dodaj projekt"
                  : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
