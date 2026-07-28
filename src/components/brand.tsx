import { CalendarRange } from "lucide-react";

import { cn } from "@/lib/utils";

// Dyskretna sygnatura marki: stonowany kwadracik z akcentem + nazwa.
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <CalendarRange className="size-4" />
      </span>
      <span className="tracking-tight">FTE Planner</span>
    </span>
  );
}
