import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/info-hint";

// Kafelek KPI: liczba + etykieta. Kolor niesie tylko ikona (akcent), a wariant
// "warn" podświetla wartość semantycznie, gdy jest > 0 (np. przeciążenia).
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "warn";
  /** Skąd bierze się ta liczba i jak jest liczona. */
  hint?: ReactNode;
}) {
  const alert = tone === "warn" && Number(value) > 0;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          {label}
          {hint && <InfoHint label={`Jak liczymy: ${label}`}>{hint}</InfoHint>}
        </span>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            alert ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <div
        className={cn(
          "mt-3 text-3xl font-semibold tracking-tight tabular-nums",
          alert && "text-destructive"
        )}
      >
        {value}
      </div>
    </div>
  );
}
