import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Gauge } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/app/actions/auth";
import { roleLabels } from "@/lib/permissions";
import { employeeWorkload, monthsBetween } from "@/lib/staffing";
import { formatMonthLabel, ym } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeTimeline } from "./_components/employee-timeline";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });
  return {
    title: user
      ? `${user.firstName} ${user.lastName} — FTE Planner`
      : "Pracownik — FTE Planner",
  };
}

const statusMeta = {
  approved: { label: "Aktywny", variant: "secondary" as const },
  pending: { label: "Oczekuje", variant: "warning" as const },
  inactive: { label: "Nieaktywny", variant: "destructive" as const },
};



/** Oś czasu karty: trzy miesiące wstecz i dziewięć w przód od dziś. */
function timelineMonths(): string[] {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 9, 1));
  return monthsBetween(ym(from), ym(to));
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("viewResources");

  const { id } = await params;

  const employee = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      position: { select: { name: true } },
      skills: { select: { name: true }, orderBy: { name: "asc" } },
      role: true,
      status: true,
      assignments: {
        orderBy: [{ startMonth: "asc" }],
        select: {
          id: true,
          startMonth: true,
          endMonth: true,
          fte: true,
          isConflict: true,
          projectRole: {
            select: {
              position: { select: { name: true } },
              project: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  const assignments = employee.assignments.map((a) => ({
    id: a.id,
    startMonth: a.startMonth,
    endMonth: a.endMonth,
    fte: Number(a.fte),
    isConflict: a.isConflict,
    rolePosition: a.projectRole.position.name,
    projectId: a.projectRole.project.id,
    projectName: a.projectRole.project.name,
  }));

  const months = timelineMonths();
  const workload = employeeWorkload(months, assignments);
  const currentMonth = ym(new Date());
  const thisMonth = workload.find((m) => m.month === currentMonth);
  const overloadedMonths = workload.filter((m) => m.isOverloaded);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-muted-foreground">
            {employee.position?.name || "Brak stanowiska"} · {employee.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusMeta[employee.status].variant}>
            {statusMeta[employee.status].label}
          </Badge>
          <Badge variant="outline">{roleLabels[employee.role]}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={`Obciążenie (${formatMonthLabel(currentMonth)})`}
          value={String(Number((thisMonth?.total ?? 0).toFixed(2)))}
          icon={Gauge}
          tone={thisMonth?.isOverloaded ? "warn" : "default"}
          hint="Suma FTE ze wszystkich przydziałów tej osoby obejmujących bieżący miesiąc. 1.00 to pełny etat — wartość wyższa oznacza zaplanowanie ponad dostępność."
        />
        <StatCard
          label="Projekty"
          value={new Set(assignments.map((a) => a.projectId)).size}
          icon={ClipboardList}
          hint="Liczba różnych projektów w całej historii przydziałów tej osoby — także zakończonych i przyszłych, nie tylko bieżących. Dwie role w jednym projekcie liczą się raz."
        />
        <StatCard
          label="Miesiące z przeciążeniem"
          value={overloadedMonths.length}
          icon={Gauge}
          tone="warn"
          hint="Ile miesięcy na osi czasu poniżej ma sumę FTE powyżej 1.00. Oś obejmuje trzy miesiące wstecz i dziewięć w przód od dziś, więc dalsza przyszłość nie jest tu liczona."
        />
      </div>

      {employee.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kompetencje</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {employee.skills.map((s) => (
              <Badge key={s.name} variant="outline">
                {s.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Oś czasu zaangażowania</h2>
        {assignments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Brak przydziałów. Ta osoba nie jest obsadzona na żadnym projekcie.
          </p>
        ) : (
          <EmployeeTimeline
            months={months}
            assignments={assignments}
            workload={workload}
            currentMonth={currentMonth}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Przydziały</h2>
        {assignments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Brak przydziałów.
          </p>
        ) : (
          <Card>
            <CardHeader className="pb-0">
              <CardDescription>
                Projekty, role i okresy, w których ta osoba jest zaplanowana.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {assignments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/app/projekty/${a.projectId}`}
                        className="truncate font-medium hover:underline"
                      >
                        {a.projectName}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {a.rolePosition} · {a.startMonth} – {a.endMonth}
                      </div>
                    </div>
                    <Badge
                      variant={a.isConflict ? "destructive" : "secondary"}
                      className={cn("shrink-0 tabular-nums")}
                    >
                      {a.fte.toFixed(2)} FTE
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
