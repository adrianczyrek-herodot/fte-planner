"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function SearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pushedRef = useRef(initialQuery);

  // Pole jest niekontrolowane (żeby pisanie nie czekało na serwer), więc gdy
  // adres zmieni się z zewnątrz — np. kliknięcie „Pracownicy" w menu czyści
  // wyszukiwanie — przepisujemy wartość ręcznie. Własnych zmian nie ruszamy.
  useEffect(() => {
    if (initialQuery !== pushedRef.current && inputRef.current) {
      inputRef.current.value = initialQuery;
      pushedRef.current = initialQuery;
    }
  }, [initialQuery]);

  function handleChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      pushedRef.current = value.trim();
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      router.replace(`/app/pracownicy?${params.toString()}`, { scroll: false });
    }, 300);
  }

  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder="Szukaj po imieniu, nazwisku lub e-mailu…"
        defaultValue={initialQuery}
        onChange={(event) => handleChange(event.target.value)}
        className="pl-8"
      />
    </div>
  );
}
