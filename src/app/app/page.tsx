import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FolderKanban,
  Gauge,
  Users,
} from "lucide-react";

import { getCurrentRole } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/permissions";
import { ym, formatMonthLabel } from "@/lib/timeline";
import { isOverAllocated, sumFte } from "@/lib/fte";
import { formatDate, getProjectDueStatus, projectStatusMeta } from "@/lib/project-status";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AppDashboardPage() {
  const { session, role } = await getCurrentRole();
  const user = session.user;

  const now = new Date();
  const currentMonth = ym(now);

  // --- Ograniczony dashboard zwykłego użytkownika ---------------------------
  if (role === "user") {
    const myAssignments = await prisma.assignment.findMany({
      where: { userId: user.id, endMonth: { gte: currentMonth } },
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
    });

    const thisMonthFte = sumFte(
      myAssignments
        .filter((a) => a.startMonth <= currentMonth && a.endMonth >= currentMonth)
        .map((a) => Number(a.fte))
    );

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Witaj, {user.name}</h1>
          <p className="text-muted-foreground">Twoje przydziały i obciążenie.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:max-w-xs">
          <StatCard
            label={`Twoje obciążenie (${formatMonthLabel(currentMonth)})`}
            value={String(Number(thisMonthFte.toFixed(2)))}
            icon={Gauge}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-muted-foreground" />
              Moje przydziały
            </CardTitle>
            <CardDescription>
              Bieżące i nadchodzące zaangażowanie w projektach.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nie masz jeszcze żadnych przydziałów.
              </p>
            ) : (
              <ul className="divide-y">
                {myAssignments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {a.projectRole.project.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.projectRole.position.name} · {a.startMonth} – {a.endMonth}
                      </div>
                    </div>
                    <Badge
                      variant={a.isConflict ? "destructive" : "secondary"}
                      className="shrink-0"
                    >
                      {Number(a.fte).toFixed(2)} FTE
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Pełny dashboard zarządczy (admin / menedżer) -------------------------
  const [projectCount, employeeCount, monthAssignments, upcoming] =
    await Promise.all([
      prisma.project.count(),
      prisma.user.count({ where: { status: "approved" } }),
      // Przydziały nachodzące na bieżący miesiąc.
      prisma.assignment.findMany({
        where: {
          startMonth: { lte: currentMonth },
          endMonth: { gte: currentMonth },
        },
        select: { userId: true, fte: true },
      }),
      prisma.project.findMany({
        where: { endDate: { gte: now } },
        orderBy: { endDate: "asc" },
        take: 5,
        select: { id: true, name: true, startDate: true, endDate: true },
      }),
    ]);

  const assignmentCount = monthAssignments.length;
  const ftesByUser = new Map<string, number[]>();
  for (const a of monthAssignments) {
    const list = ftesByUser.get(a.userId) ?? [];
    list.push(Number(a.fte));
    ftesByUser.set(a.userId, list);
  }
  const overloadedCount = [...ftesByUser.values()].filter((f) =>
    isOverAllocated(sumFte(f))
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Witaj, {user.name}</h1>
        <p className="text-muted-foreground">
          Przegląd planowania FTE Twojego zespołu.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projekty" value={projectCount} icon={FolderKanban} />
        <StatCard label="Pracownicy" value={employeeCount} icon={Users} />
        <StatCard
          label="Przydziały (ten miesiąc)"
          value={assignmentCount}
          icon={ClipboardList}
        />
        <StatCard
          label="Przeciążeni (ten miesiąc)"
          value={overloadedCount}
          icon={AlertTriangle}
          tone="warn"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-muted-foreground" />
              Nadchodzące terminy
            </CardTitle>
            <CardDescription>
              Projekty z najbliższą datą zakończenia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Brak nadchodzących terminów.
              </p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((p) => {
                  const status = getProjectDueStatus(p.endDate);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <Link
                        href={`/app/projekty/${p.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(p.endDate)}
                        </span>
                        <Badge variant={projectStatusMeta[status].variant}>
                          {projectStatusMeta[status].label}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Twoje konto</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Rola: {roleLabels[role]}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
