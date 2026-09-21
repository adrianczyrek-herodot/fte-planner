"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createProject, updateProject } from "@/app/actions/projects";
import { PROJECT_LINK_FIELDS } from "@/lib/validation/project";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  budget: number | null;
} & Partial<Record<(typeof PROJECT_LINK_FIELDS)[number]["key"], string | null>>;

type Props = (
  | { mode: "create"; project?: undefined }
  | { mode: "edit"; project: Project }
) & {
  trigger: React.ReactNode;
  /** Słownik stanowisk — potrzebny tylko przy zakładaniu projektu z rolami. */
  positions?: { id: string; name: string }[];
};

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

type DraftRole = {
  positionId: string;
  startMonth: string;
  endMonth: string;
  requiredFte: string;
  requiredPeople: string;
};

/** "2026-07-01" → "2026-07"; pusta data → "". */
function monthOf(date: string) {
  return date ? date.slice(0, 7) : "";
}

export function ProjectFormDialog({
  mode,
  trigger,
  project,
  positions = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createProject : updateProject;
  const [state, formAction, pending] = useActionState(action, undefined);

  // Daty są kontrolowane, żeby nowe wiersze roli mogły domyślnie dostać okres
  // projektu — bez tego trzeba by go przepisywać ręcznie przy każdej roli.
  const [startDate, setStartDate] = useState(toDateInputValue(project?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(project?.endDate));

  // Zapotrzebowanie na role deklarowane razem z projektem (tylko przy zakładaniu
  // — istniejącym projektem zarządza się na jego stronie).
  const [roles, setRoles] = useState<DraftRole[]>([]);

  useActionEffect(state, (s) => {
    if (s?.success && open) setOpen(false);
  });

  function addRole() {
    setRoles((r) => [
      ...r,
      {
        positionId: "",
        startMonth: monthOf(startDate),
        endMonth: monthOf(endDate),
        requiredFte: "1",
        requiredPeople: "1",
      },
    ]);
  }

  function updateRole(index: number, patch: Partial<DraftRole>) {
    setRoles((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRole(index: number) {
    setRoles((r) => r.filter((_, i) => i !== index));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {state?.errors?.endDate && (
                <p className="text-sm text-destructive">{state.errors.endDate[0]}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="budget">Budżet (PLN)</Label>
            <Input
              id="budget"
              name="budget"
              type="number"
              step="0.01"
              min="0"
              defaultValue={project?.budget != null ? String(project.budget) : ""}
              placeholder="np. 150000"
            />
            {state?.errors?.budget && (
              <p className="text-sm text-destructive">{state.errors.budget[0]}</p>
            )}
          </div>

          {mode === "create" && (
            <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">
                Zapotrzebowanie na role
              </legend>
              <input type="hidden" name="rolesJson" value={JSON.stringify(roles)} />

              {roles.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {positions.length === 0
                    ? "Słownik stanowisk jest pusty — dodaj pozycje w Ustawieniach, aby zadeklarować role tutaj."
                    : "Zadeklaruj, ilu ludzi w jakiej roli i na jaki okres potrzebujesz. Możesz to też zrobić później, na stronie projektu."}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {roles.map((row, i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-md border p-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={row.positionId || undefined}
                          onValueChange={(v) => updateRole(i, { positionId: v })}
                        >
                          <SelectTrigger
                            aria-label={`Stanowisko, rola ${i + 1}`}
                            className="w-full"
                          >
                            <SelectValue placeholder="Wybierz stanowisko" />
                          </SelectTrigger>
                          <SelectContent>
                            {positions.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Usuń rolę ${i + 1}`}
                          onClick={() => removeRole(i)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          aria-label={`Od miesiąca, rola ${i + 1}`}
                          type="month"
                          value={row.startMonth}
                          onChange={(e) => updateRole(i, { startMonth: e.target.value })}
                        />
                        <Input
                          aria-label={`Do miesiąca, rola ${i + 1}`}
                          type="month"
                          value={row.endMonth}
                          onChange={(e) => updateRole(i, { endMonth: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5">
                          <Input
                            aria-label={`Liczba osób, rola ${i + 1}`}
                            type="number"
                            step="1"
                            min="1"
                            value={row.requiredPeople}
                            onChange={(e) =>
                              updateRole(i, { requiredPeople: e.target.value })
                            }
                          />
                          <span className="shrink-0 text-xs text-muted-foreground">
                            osób
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            aria-label={`Wymagane FTE, rola ${i + 1}`}
                            type="number"
                            step="0.25"
                            min="0.25"
                            value={row.requiredFte}
                            onChange={(e) =>
                              updateRole(i, { requiredFte: e.target.value })
                            }
                          />
                          <span className="shrink-0 text-xs text-muted-foreground">
                            FTE
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button type="button" variant="outline" size="sm" onClick={addRole}>
                <Plus />
                Dodaj rolę
              </Button>
            </fieldset>
          )}

          <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Linki</legend>
            {PROJECT_LINK_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={field.key} className="text-xs font-normal text-muted-foreground">
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  name={field.key}
                  type="url"
                  inputMode="url"
                  defaultValue={project?.[field.key] ?? ""}
                  placeholder="https://"
                />
                {state?.errors?.[field.key] && (
                  <p className="text-sm text-destructive">
                    {state.errors[field.key]![0]}
                  </p>
                )}
              </div>
            ))}
          </fieldset>

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
