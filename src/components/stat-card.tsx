import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/info-hint";

// Kafelek KPI: liczba + etykieta. Kolor niesie tylko ikona (akcent). Wariant
// "warn" podświetla licznik, gdy jest > 0 (np. liczba przeciążonych), a
// "alert" podświetla wartość zawsze — gdy o problemie decyduje coś innego niż
// sama liczba (np. obciążenie 0,82 przy dniu z przeciążeniem).
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  href,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "warn" | "alert";
  /** Skąd bierze się ta liczba i jak jest liczona. */
  hint?: ReactNode;
  /** Gdzie zobaczyć szczegóły — kafelek staje się wtedy linkiem. */
  href?: string;
}) {
  const alert = tone === "alert" || (tone === "warn" && typeof value === "number" && value > 0);

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-5 shadow-sm",
        href && "transition-shadow hover:shadow-md"
      )}
    >
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
        {href ? (
          <Link href={href} className="after:absolute after:inset-0 hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
