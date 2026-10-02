"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Przycisk kosza z potwierdzeniem. Usunięcia w aplikacji są nieodwracalne, a
 * kosz stoi zwykle tuż obok ołówka edycji — jedno złe kliknięcie nie może
 * kasować danych bez pytania.
 *
 * Akcja dostaje FormData z polami `fields` (np. `{ id }`), tak jak dotychczas
 * dostawała je z ukrytych inputów formularza.
 */
export function ConfirmDelete({
  label,
  title,
  description,
  action,
  fields,
  disabled,
}: {
  /** Etykieta przycisku dla czytników ekranu, np. „Usuń rolę". */
  label: string;
  title: string;
  description: ReactNode;
  action: (formData: FormData) => void | Promise<unknown>;
  fields: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} disabled={disabled}>
          <Trash2 className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <form action={async (fd) => void (await action(fd))}>
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <AlertDialogAction type="submit" variant="destructive">
              Usuń
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
