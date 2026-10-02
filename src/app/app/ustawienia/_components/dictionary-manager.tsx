"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  createDictionaryEntry,
  deleteDictionaryEntry,
  renameDictionaryEntry,
} from "@/app/actions/dictionaries";
import { useActionForm, useFreshState } from "@/lib/hooks/use-action-form";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Entry = { id: string; name: string; usage: string; inUse: boolean };

export function DictionaryManager({
  kind,
  title,
  description,
  addLabel,
  entries,
}: {
  kind: "position" | "skill";
  title: string;
  description: string;
  addLabel: string;
  entries: Entry[];
}) {
  const [createState, createAction, creating] = useActionForm(
    createDictionaryEntry.bind(null, kind),
    undefined
  );
  const [renameState, renameAction, renaming] = useActionForm(
    renameDictionaryEntry.bind(null, kind),
    undefined
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  // Błąd zmiany nazwy dotyczy edytowanej pozycji — po anulowaniu albo przejściu
  // do innej pozycji nie może się pod nią pojawiać.
  const renameShown = useFreshState(renameState, editingId);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  // Formularz dodawania czyścimy przez remount po udanym zapisie.
  const [addKey, setAddKey] = useState(0);
  useActionEffect(createState, (s) => {
    if (s?.success) setAddKey((k) => k + 1);
  });
  useActionEffect(renameState, (s) => {
    if (s?.success) setEditingId(null);
  });

  function remove(id: string) {
    setDeleteError(null);
    startDelete(async () => {
      const res = await deleteDictionaryEntry(kind, id);
      if (!res.ok) setDeleteError(res.message ?? "Nie udało się usunąć pozycji.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          key={addKey}
          onSubmit={createAction}
          className="flex flex-wrap items-start gap-2"
        >
          <div className="flex min-w-56 flex-col gap-1">
            <Input name="name" placeholder={addLabel} aria-label={addLabel} required />
            {createState?.errors?.name && (
              <p className="text-sm text-destructive">{createState.errors.name[0]}</p>
            )}
          </div>
          <Button type="submit" disabled={creating}>
            <Plus />
            {creating ? "Dodawanie…" : "Dodaj"}
          </Button>
        </form>

        {createState?.message && (
          <Alert variant="destructive">
            <AlertDescription>{createState.message}</AlertDescription>
          </Alert>
        )}
        {deleteError && (
          <Alert variant="destructive">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}

        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Słownik jest pusty.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                {editingId === entry.id ? (
                  <form onSubmit={renameAction} className="flex flex-1 items-start gap-2">
                    <input type="hidden" name="id" value={entry.id} />
                    <div className="flex flex-1 flex-col gap-1">
                      <Input
                        name="name"
                        defaultValue={entry.name}
                        aria-label={`Nowa nazwa dla ${entry.name}`}
                        autoFocus
                        required
                      />
                      {renameShown?.errors?.name && (
                        <p className="text-sm text-destructive">
                          {renameShown.errors.name[0]}
                        </p>
                      )}
                      {renameShown?.message && (
                        <p className="text-sm text-destructive">{renameShown.message}</p>
                      )}
                    </div>
                    <Button type="submit" size="icon-sm" disabled={renaming} aria-label="Zapisz nazwę">
                      <Check />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingId(null)}
                      aria-label="Anuluj zmianę nazwy"
                    >
                      <X />
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.name}</span>
                      {entry.usage && (
                        <Badge variant="outline" className="font-normal">
                          {entry.usage}
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setDeleteError(null);
                          setEditingId(entry.id);
                        }}
                        aria-label={`Zmień nazwę: ${entry.name}`}
                      >
                        <Pencil />
                      </Button>
                      {entry.inUse ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled
                          aria-label={`Usuń: ${entry.name}`}
                          title="Pozycja jest w użyciu — nie można jej usunąć"
                        >
                          <Trash2 />
                        </Button>
                      ) : (
                        <ConfirmDelete
                          label={`Usuń: ${entry.name}`}
                          title="Usunąć pozycję słownika?"
                          description={
                            kind === "position"
                              ? `Stanowisko „${entry.name}” zostanie usunięte razem z historią jego stawek. Tej operacji nie można cofnąć.`
                              : `Kompetencja „${entry.name}” zostanie usunięta. Tej operacji nie można cofnąć.`
                          }
                          action={() => remove(entry.id)}
                          fields={{}}
                          disabled={deleting}
                        />
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
