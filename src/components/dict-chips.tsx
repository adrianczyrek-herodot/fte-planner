"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type Item = { id: string; name: string };

/**
 * Wybór wielu pozycji ze słownika — klikalne etykietki zamiast wpisywania.
 * Wartości jadą w ukrytych polach, więc komponent działa w zwykłym formularzu
 * z server action, bez dodatkowego stanu po stronie akcji.
 */
export function DictChips({
  name,
  items,
  defaultSelected = [],
  emptyHint = "Słownik jest pusty.",
}: {
  name: string;
  items: Item[];
  defaultSelected?: string[];
  emptyHint?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyHint}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      {items.map((item) => {
        const isOn = selected.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            aria-pressed={isOn}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
              isOn
                ? "border-primary/40 bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {isOn && <Check className="size-3" />}
            {item.name}
          </button>
        );
      })}
    </div>
  );
}
