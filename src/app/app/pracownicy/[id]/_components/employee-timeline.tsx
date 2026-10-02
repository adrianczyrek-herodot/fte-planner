import { formatFte } from "@/lib/fte";
import { assignmentFteInMonth, type WorkloadMonth } from "@/lib/staffing";
import { formatMonthLabel, formatYmdRange, ymd } from "@/lib/timeline";
import { cn } from "@/lib/utils";

type Assignment = {
  id: string;
  startDate: Date;
  endDate: Date;
  fte: number;
  isConflict: boolean;
  rolePosition: string;
  projectId: string;
  projectName: string;
};

const fmt = formatFte;

/**
 * Oś czasu jednej osoby: wiersz na przydział, kolumna na miesiąc. Przydziały
 * są dzienne, a komórka pokazuje udział przydziału w miesiącu. Ostatni wiersz
 * podsumowuje obłożenie i wyraźnie oznacza miesiące, w których osoba jest
 * przeciążona (szczyt dzienny powyżej 1,00).
 */
export function EmployeeTimeline({
  months,
  assignments,
  workload,
  currentMonth,
}: {
  months: string[];
  assignments: Assignment[];
  workload: WorkloadMonth[];
  currentMonth: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-56 border-b border-r bg-card p-3 text-left text-xs font-medium text-muted-foreground">
              Projekt i rola
            </th>
            {months.map((m) => (
              <th
                key={m}
                className={cn(
                  "border-b p-2 text-center text-xs font-medium whitespace-nowrap capitalize",
                  m === currentMonth ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                {formatMonthLabel(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => {
            // Czerwień w siatce oznacza miesiąc, w którym osoba jest
            // przeciążona — nie flagę przydziału. Flaga dotyczy całego
            // przydziału, więc podświetlałaby też miesiące bez problemu.
            const over = new Set(
              workload.filter((w) => w.isOverloaded).map((w) => w.month)
            );
            return (
            <tr key={a.id}>
              <td className="sticky left-0 z-10 border-b border-r bg-card p-3 align-top">
                <div className="truncate font-medium">{a.projectName}</div>
                <div className="text-xs text-muted-foreground">
                  {a.rolePosition} · {formatYmdRange(ymd(a.startDate), ymd(a.endDate))}
                </div>
              </td>
              {months.map((m) => {
                const fte = assignmentFteInMonth(a, m);
                return (
                  <td
                    key={m}
                    title={
                      fte > 0
                        ? `${a.projectName} — ${formatMonthLabel(m)}: ${fmt(fte)} FTE`
                        : undefined
                    }
                    className={cn(
                      "border-b p-2 text-center tabular-nums",
                      fte > 0
                        ? over.has(m)
                          ? "bg-destructive/10 font-medium text-destructive"
                          : "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {fte > 0 ? fmt(fte) : "—"}
                  </td>
                );
              })}
            </tr>
            );
          })}

          <tr>
            <td className="sticky left-0 z-10 border-r bg-muted/40 p-3 font-medium">
              Razem
            </td>
            {workload.map((w) => (
              <td
                key={w.month}
                title={
                  w.isOverloaded
                    ? `${formatMonthLabel(w.month)}: udział ${fmt(w.total)} FTE, ale w najgorszym dniu ${fmt(w.peak)} FTE — przeciążenie o ${fmt(w.peak - 1)} FTE`
                    : `${formatMonthLabel(w.month)}: ${fmt(w.total)} FTE`
                }
                className={cn(
                  "bg-muted/40 p-2 text-center font-medium tabular-nums",
                  w.isOverloaded
                    ? "text-destructive"
                    : w.total === 0
                      ? "text-muted-foreground"
                      : ""
                )}
              >
                {w.total === 0 ? "—" : fmt(w.total)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
