"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Edytor tagów: chipsy + pole dodawania (Enter/przecinek). Każdy tag renderuje
// ukryty input o tej samej nazwie, więc w FormData trafiają jako wiele wartości
// (odczyt: formData.getAll(name)).
export function TagsInput({
  name,
  defaultValue = [],
  suggestions = [],
  placeholder,
}: {
  name: string;
  defaultValue?: string[];
  suggestions?: string[];
  placeholder?: string;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");
  const listId = `${name}-suggestions`;

  function addTag(raw: string) {
    const value = raw.trim();
    if (value && !tags.includes(value)) setTags([...tags, value]);
    setDraft("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      {tags.map((t) => (
        <input key={t} type="hidden" name={name} value={t} />
      ))}

      <div className="flex flex-wrap items-center gap-1.5 rounded-md border p-1.5 focus-within:ring-1 focus-within:ring-ring">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Usuń ${t}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(draft);
            } else if (e.key === "Backspace" && !draft && tags.length) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          onBlur={() => addTag(draft)}
          list={listId}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>

      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
