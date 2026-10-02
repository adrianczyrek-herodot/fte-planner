"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { InfoHint } from "@/components/info-hint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_SKILLS = "__all__";

export function ZasobyFilters({
  range,
  status,
  skill,
  skills,
}: {
  range: string;
  status: string;
  skill: string;
  skills: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function set(key: string, value: string, clearValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === clearValue) params.delete(key);
    else params.set(key, value);
    router.replace(`/app/zasoby?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={range} onValueChange={(v) => set("range", v, "quarter")}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Zakres" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quarter">Bieżący kwartał</SelectItem>
          <SelectItem value="next-quarter">Następny kwartał</SelectItem>
          <SelectItem value="half-year">Najbliższe pół roku</SelectItem>
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => set("status", v, "all")}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Dostępność" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszyscy</SelectItem>
          <SelectItem value="available">Dostępni (&lt; 1 FTE)</SelectItem>
          <SelectItem value="over">Przeciążeni</SelectItem>
        </SelectContent>
      </Select>

      <InfoHint label="Jak działają filtry">
        Zakres liczy się od dziś: kwartał zaczyna się od pierwszego miesiąca
        bieżącego kwartału (może już częściowo minąć), a pół roku to sześć
        miesięcy licząc od bieżącego. Filtr dostępności patrzy na
        <strong> którykolwiek</strong> miesiąc zakresu, nie na cały: „Dostępni”
        to osoby mające choć jeden miesiąc z udziałem poniżej pełnego etatu, a
        „Przeciążeni” — choć jeden dzień roboczy, w którym suma przydziałów
        przekracza 1,00. Ta sama osoba może więc spełniać oba warunki naraz.
      </InfoHint>

      {skills.length > 0 && (
        <Select
          defaultValue={skill || ALL_SKILLS}
          onValueChange={(v) => set("skill", v, ALL_SKILLS)}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Kompetencja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SKILLS}>Wszystkie kompetencje</SelectItem>
            {skills.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
