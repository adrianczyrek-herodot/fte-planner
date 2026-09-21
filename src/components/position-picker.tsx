"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { quickAddPosition } from "@/app/actions/dictionaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Item = { id: string; name: string };

/**
 * Wybór stanowiska ze słownika z możliwością dopisania nowego na miejscu.
 * Bez tego definiowanie zapotrzebowania na role wymagałoby wyjścia do ustawień
 * w środku planowania projektu — a to jest dokładnie ten moment, w którym
 * nazwa nowego stanowiska przychodzi do głowy.
 */
export function PositionPicker({
  name,
  positions,
  defaultValue,
  id,
}: {
  name: string;
  positions: Item[];
  defaultValue?: string | null;
  id?: string;
}) {
  const [items, setItems] = useState<Item[]>(positions);
  const [value, setValue] = useState<string | undefined>(defaultValue ?? undefined);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function add() {
    setError(null);
    setPending(true);
    try {
      const res = await quickAddPosition(draft);
      if (!res.ok || !res.id) {
        setError(res.message ?? "Nie udało się dodać stanowiska.");
        return;
      }
      setItems((prev) =>
        prev.some((p) => p.id === res.id)
          ? prev
          : [...prev, { id: res.id!, name: res.name! }].sort((a, b) =>
              a.name.localeCompare(b.name, "pl")
            )
      );
      setValue(res.id);
      setDraft("");
      setAdding(false);
    } finally {
      setPending(false);
    }
  }

  // Radix pokazuje etykietę wybranej pozycji z listy zamontowanych elementów,
  // a te montują się dopiero po otwarciu listy. Podajemy ją więc wprost —
  // inaczej po dodaniu stanowiska (albo przy edycji roli) pole wyglądałoby na
  // puste, choć wartość jest ustawiona.
  const selectedName = items.find((i) => i.id === value)?.name;

  return (
    <div className="flex flex-col gap-2">
      {/* Wartość jedzie w ukrytym polu, bo Radix Select nie jest polem formularza. */}
      <input type="hidden" name={name} value={value ?? ""} />

      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Wybierz stanowisko">
              {selectedName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {items.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!adding && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setAdding(true)}
            aria-label="Dodaj nowe stanowisko do słownika"
            title="Dodaj nowe stanowisko"
          >
            <Plus />
          </Button>
        )}
      </div>

      {adding && (
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="np. Frontend Developer"
              aria-label="Nazwa nowego stanowiska"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="button" size="sm" onClick={add} disabled={pending || !draft.trim()}>
            {pending ? "Dodawanie…" : "Dodaj"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setAdding(false);
              setError(null);
            }}
            aria-label="Anuluj dodawanie stanowiska"
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  );
}
