"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function SkillFilter({
  skills,
  initialSkill,
}: {
  skills: string[];
  initialSkill: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete("skill");
    else params.set("skill", value);
    router.replace(`/app/pracownicy?${params.toString()}`, { scroll: false });
  }

  if (skills.length === 0) return null;

  return (
    <Select defaultValue={initialSkill || ALL} onValueChange={handleChange}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Filtruj po kompetencji" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Wszystkie kompetencje</SelectItem>
        {skills.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
