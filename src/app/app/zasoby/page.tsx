import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/app/actions/auth";
import { formatFte } from "@/lib/fte";
import { monthBounds } from "@/lib/period";
import { employeeWorkload, type WorkloadMonth } from "@/lib/staffing";
import { formatMonthLabel, todayInPoland, ym } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/info-hint";
import { ZasobyFilters } from "./_components/zasoby-filters";

export const metadata: Metadata = {
  title: "Zasoby — FTE Planner",
};

// Lista miesięcy "YYYY-MM" dla wybranego zakresu.
function monthsForRange(range: string): string[] {
  const now = todayInPoland();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  const startYear = y;
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
  return v === 0 ? "—" : formatFte(v);
}

// Czerwień = przeciążenie ze szczytu dziennego, nie z udziału w miesiącu:
// dwa tygodnie na 1,50 FTE to realny problem, nawet gdy miesiąc wychodzi 0,80.
function cellClass(w: WorkloadMonth) {
  if (w.isOverloaded) return "bg-destructive/10 text-destructive font-medium";
  if (Math.round(w.total * 100) === 100) return "bg-primary/10 text-primary font-medium";
  if (w.total === 0) return "text-muted-foreground";
  return "";
}

export default async function ZasobyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; status?: string; skill?: string }>;
}) {
  await requireCapability("viewResources");

  const sp = await searchParams;
  const range = sp.range ?? "quarter";
  const status = sp.status ?? "all";
  const skill = sp.skill?.trim() ?? "";

  const months = monthsForRange(range);

  const [employees, loads, skillRows] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: "approved",
        ...(skill ? { skills: { some: { name: skill } } } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: { select: { name: true } },
        skills: { select: { name: true }, orderBy: { name: "asc" } },
      },
    }),
    // Przydziały nachodzące na wybrany zakres (rozbijamy je na miesiące).
    prisma.assignment.findMany({
      where: {
        startDate: { lte: monthBounds(months[months.length - 1]).last },
        endDate: { gte: monthBounds(months[0]).first },
      },
      select: { id: true, userId: true, startDate: true, endDate: true, fte: true },
    }),
    prisma.skill.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  // Udział w miesiącu, nie surowe FTE: przydział na pół lipca liczy się w
  // lipcu za połowę, bo siatka odpowiada na pytanie „ile pracy w tym miesiącu".
  // Przeciążenie — ze szczytu dziennego. Ta sama funkcja liczy kartę
  // pracownika, listę pracowników i panel, więc liczby się nie rozjeżdżają.
  const byUser = new Map<string, { id: string; startDate: Date; endDate: Date; fte: number }[]>();
  for (const a of loads) {
    const list = byUser.get(a.userId) ?? [];
    list.push({ id: a.id, startDate: a.startDate, endDate: a.endDate, fte: Number(a.fte) });
    byUser.set(a.userId, list);
  }

  const rows = employees
    .map((e) => {
      const cells = employeeWorkload(months, byUser.get(e.id) ?? []);
      return {
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        positionName: e.position?.name ?? null,
        skillNames: e.skills.map((s) => s.name),
        cells,
        hasGap: cells.some((w) => w.total < 1),
        hasOver: cells.some((w) => w.isOverloaded),
      };
    })
    .filter((r) =>
      status === "available" ? r.hasGap : status === "over" ? r.hasOver : true
    );

  const allSkills = skillRows.map((s) => s.name);

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
                  <span className="flex items-center gap-1.5">
                    Pracownik
                    <InfoHint label="Jak czytać tę siatkę">
                      Każda komórka to udział tej osoby w danym miesiącu:
                      przydział pokrywający pół miesiąca liczy się za pół, bo
                      pytanie brzmi „ile pracy w tym miesiącu”. Kreska oznacza
                      brak zaangażowania, kolor niebieski dokładnie pełny etat
                      (1,00), a czerwony przeciążenie — dzień roboczy, w którym
                      suma przydziałów przekracza 1,00, nawet jeśli udział w
                      miesiącu jest niższy. Na liście są wyłącznie osoby o
                      statusie „Aktywny”.
                    </InfoHint>
                  </span>
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
                      <Link
                        href={`/app/pracownicy/${r.id}`}
                        className="hover:underline"
                      >
                        {r.firstName} {r.lastName}
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span>{r.positionName ?? "—"}</span>
                      {r.skillNames.slice(0, 3).map((s) => (
                        <Badge key={s} variant="outline" className="font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  {r.cells.map((w) => (
                    <td key={w.month} className="px-2 py-2 text-center">
                      <span
                        title={
                          w.isOverloaded
                            ? `Przeciążenie: w najgorszym dniu ${formatFte(w.peak)} FTE`
                            : undefined
                        }
                        className={cn(
                          "inline-block min-w-10 rounded-md px-2 py-1 tabular-nums",
                          cellClass(w)
                        )}
                      >
                        {fmtFte(w.total)}
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
