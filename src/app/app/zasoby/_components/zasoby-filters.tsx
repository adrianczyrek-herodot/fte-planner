"use client";

import { useRouter, useSearchParams } from "next/navigation";

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
      <Select defaultValue={range} onValueChange={(v) => set("range", v, "quarter")}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Zakres" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quarter">Bieżący kwartał</SelectItem>
          <SelectItem value="next-quarter">Następny kwartał</SelectItem>
          <SelectItem value="half-year">Najbliższe pół roku</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue={status} onValueChange={(v) => set("status", v, "all")}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Dostępność" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszyscy</SelectItem>
          <SelectItem value="available">Dostępni (&lt; 1 FTE)</SelectItem>
          <SelectItem value="over">Przeciążeni (&gt; 1 FTE)</SelectItem>
        </SelectContent>
      </Select>

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
