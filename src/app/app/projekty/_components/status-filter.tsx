"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StatusFilter({ initialStatus }: { initialStatus: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.replace(`/app/projekty?${params.toString()}`, { scroll: false });
  }

  return (
    <Select defaultValue={initialStatus} onValueChange={handleChange}>
      <SelectTrigger className="w-52">
        <SelectValue placeholder="Filtruj po terminie" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Wszystkie projekty</SelectItem>
        <SelectItem value="upcoming">Przed terminem</SelectItem>
        <SelectItem value="overdue">Po terminie</SelectItem>
      </SelectContent>
    </Select>
  );
}
