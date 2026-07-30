import type { Metadata } from "next";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/app/actions/auth";
import { isOverAllocated, sumFte } from "@/lib/fte";
import { monthsBetween } from "@/lib/staffing";
import { formatMonthLabel, ym } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ZasobyFilters } from "./_components/zasoby-filters";

export const metadata: Metadata = {
  title: "Zasoby — FTE Planner",
};

// Lista miesięcy "YYYY-MM" dla wybranego zakresu.
function monthsForRange(range: string): string[] {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  let startYear = y;
  let startMonth = m;
  let count = 6;

  if (range === "quarter" || range === "next-quarter") {
    const quarterStart = Math.floor(m / 3) * 3;
    startMonth = range === "next-quarter" ? quarterStart + 3 : quarterStart;
    count = 3;
  }

  const base = new Date(Date.UTC(startYear, startMonth, 1));
  return Array.from({ length: count }, (_, i) =>
    ym(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1)))
  );
}

function fmtFte(v: number) {
  return v === 0 ? "—" : String(Number(v.toFixed(2)));
}

function cellClass(v: number) {
  if (isOverAllocated(v)) return "bg-destructive/10 text-destructive font-medium";
  if (Math.round(v * 100) === 100) return "bg-primary/10 text-primary font-medium";
  if (v === 0) return "text-muted-foreground";
  return "";
}

export default async function ZasobyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; status?: string; skill?: string }>;
}) {
  await requireManager();

  const sp = await searchParams;
  const range = sp.range ?? "quarter";
  const status = sp.status ?? "all";
  const skill = sp.skill?.trim() ?? "";

  const months = monthsForRange(range);

  const [employees, loads, skillRows] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: "approved",
        ...(skill ? { skills: { has: skill } } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, position: true, skills: true },
    }),
    // Przydziały nachodzące na wybrany zakres (rozbijamy je na miesiące).
    prisma.assignment.findMany({
      where: {
        startMonth: { lte: months[months.length - 1] },
        endMonth: { gte: months[0] },
      },
      select: { userId: true, startMonth: true, endMonth: true, fte: true },
    }),
    prisma.user.findMany({ select: { skills: true } }),
  ]);

  const monthSet = new Set(months);
  const loadMap = new Map<string, number[]>(); // "userId:month" → lista FTE
  for (const a of loads) {
    for (const m of monthsBetween(a.startMonth, a.endMonth)) {
      if (!monthSet.has(m)) continue;
      const key = `${a.userId}:${m}`;
      const list = loadMap.get(key) ?? [];
      list.push(Number(a.fte));
      loadMap.set(key, list);
    }
  }

  const rows = employees
    .map((e) => {
      const cells = months.map((m) => sumFte(loadMap.get(`${e.id}:${m}`) ?? []));
      return {
        ...e,
        cells,
        hasGap: cells.some((v) => v < 1),
        hasOver: cells.some((v) => isOverAllocated(v)),
      };
    })
    .filter((r) =>
      status === "available" ? r.hasGap : status === "over" ? r.hasOver : true
    );

  const allSkills = Array.from(new Set(skillRows.flatMap((r) => r.skills))).sort(
    (a, b) => a.localeCompare(b, "pl")
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Zasoby</h1>
        <p className="text-muted-foreground">
          Obciążenie pracowników (FTE) w czasie. Filtruj po dostępności i
          kompetencjach, aby znaleźć wolne lub przeciążone osoby.
        </p>
      </div>

      <Suspense fallback={null}>
        <ZasobyFilters range={range} status={status} skill={skill} skills={allSkills} />
      </Suspense>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Brak pracowników spełniających kryteria.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="sticky left-0 z-10 bg-muted/30 px-4 py-2 text-left font-medium text-muted-foreground">
                  Pracownik
                </th>
                {months.map((m) => (
                  <th
                    key={m}
                    className="px-3 py-2 text-center font-medium text-muted-foreground capitalize"
                  >
                    {formatMonthLabel(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 bg-card px-4 py-2">
                    <div className="font-medium">
                      {r.firstName} {r.lastName}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span>{r.position ?? "—"}</span>
                      {r.skills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="outline" className="font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  {r.cells.map((v, i) => (
                    <td key={months[i]} className="px-2 py-2 text-center">
                      <span
                        className={cn(
                          "inline-block min-w-10 rounded-md px-2 py-1 tabular-nums",
                          cellClass(v)
                        )}
                      >
                        {fmtFte(v)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
