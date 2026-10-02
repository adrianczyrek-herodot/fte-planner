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
import { monthBounds } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/permissions";
import { ym, formatMonthLabel, ymd, formatYmdRange, todayInPoland } from "@/lib/timeline";
import { formatFte } from "@/lib/fte";
import { employeeWorkload } from "@/lib/staffing";
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
  const { session, role, capabilities } = await getCurrentRole();
  const user = session.user;

  const today = todayInPoland();
  const currentMonth = ym(today);
  // Granice bieżącego miesiąca — przydziały są dzienne, więc "ten miesiąc"
  // znaczy teraz "zakres nachodzący na przedział od pierwszego do ostatniego".
  const { first: monthStart, last: monthEnd } = monthBounds(currentMonth);

  // --- Ograniczony dashboard zwykłego użytkownika ---------------------------
  if (role === "user") {
    const myAssignments = await prisma.assignment.findMany({
      where: { userId: user.id, endDate: { gte: monthStart } },
      orderBy: [{ startDate: "asc" }],
      select: {
        id: true,
        startDate: true,
        endDate: true,
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

    // Ta sama miara co w Zasobach i na karcie pracownika: udział w miesiącu,
    // a przeciążenie ze szczytu dziennego.
    const [thisMonth] = employeeWorkload(
      [currentMonth],
      myAssignments.map((a) => ({
        id: a.id,
        startDate: a.startDate,
        endDate: a.endDate,
        fte: Number(a.fte),
      }))
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
            value={formatFte(thisMonth.total)}
            icon={Gauge}
            tone={thisMonth.isOverloaded ? "alert" : "default"}
            hint="Ile etatu zajmują Twoje przydziały w tym miesiącu: przydział na pół miesiąca liczy się za połowę. 1,00 to pełny etat. Wyróżnienie oznacza, że w co najmniej jednym dniu roboczym suma Twoich przydziałów przekracza 1,00."
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
                Nie masz bieżących ani nadchodzących przydziałów.
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
                        {a.projectRole.position.name} · {formatYmdRange(ymd(a.startDate), ymd(a.endDate))}
                      </div>
                    </div>
                    <Badge
                      variant={a.isConflict ? "destructive" : "secondary"}
                      className="shrink-0"
                    >
                      {formatFte(Number(a.fte))} FTE
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

  // --- Pełny dashboard zarządczy (admin / menedżer / administracja) --------
  // Administracja nie ma wglądu w projekty, więc nie dostaje kafelka ani listy
  // projektów — tylko to, co może dalej otworzyć (Zasoby).
  const canSeeProjects = capabilities.includes("viewProjects");
  const canSeeResources = capabilities.includes("viewResources");

  const [projectCount, employeeCount, monthAssignments, upcoming] =
    await Promise.all([
      canSeeProjects ? prisma.project.count() : Promise.resolve(0),
      prisma.user.count({ where: { status: "approved" } }),
      // Przydziały aktywnych osób nachodzące na bieżący miesiąc.
      prisma.assignment.findMany({
        where: {
          startDate: { lte: monthEnd },
          endDate: { gte: monthStart },
          user: { status: "approved" },
        },
        select: { id: true, userId: true, startDate: true, endDate: true, fte: true },
      }),
      canSeeProjects
        ? prisma.project.findMany({
            where: { endDate: { gte: today } },
            orderBy: [{ endDate: "asc" }, { name: "asc" }],
            take: 5,
            select: { id: true, name: true, startDate: true, endDate: true },
          })
        : Promise.resolve([]),
    ]);

  const assignmentCount = monthAssignments.length;
  const byUser = new Map<string, typeof monthAssignments>();
  for (const a of monthAssignments) {
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }
  // Przeciążenie ze szczytu dziennego — ta sama reguła, która oznacza konflikt
  // przy przydziale. Dwa pełne etaty jeden po drugim w tym samym miesiącu to
  // nie przeciążenie.
  const overloadedCount = [...byUser.values()].filter(
    (list) =>
      employeeWorkload(
        [currentMonth],
        list.map((a) => ({ ...a, fte: Number(a.fte) }))
      )[0].isOverloaded
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
        {canSeeProjects && (
          <StatCard
            label="Projekty"
            value={projectCount}
            icon={FolderKanban}
            hint="Wszystkie projekty w systemie, niezależnie od statusu i dat — również zakończone i jeszcze nierozpoczęte."
          />
        )}
        <StatCard
          label="Pracownicy"
          value={employeeCount}
          icon={Users}
          hint="Wszystkie konta o statusie „Aktywny”, także administratorzy i menedżerowie. Konta oczekujące na akceptację i nieaktywne nie są liczone."
        />
        <StatCard
          label="Przydziały (ten miesiąc)"
          value={assignmentCount}
          icon={ClipboardList}
          hint={`Liczba przydziałów aktywnych osób, które obejmują choć jeden dzień miesiąca ${formatMonthLabel(currentMonth)}. Jedna osoba na dwóch projektach daje dwa przydziały.`}
        />
        <StatCard
          label="Przeciążeni (ten miesiąc)"
          value={overloadedCount}
          icon={AlertTriangle}
          tone="warn"
          hint={`Liczba osób, które w co najmniej jednym dniu roboczym miesiąca ${formatMonthLabel(currentMonth)} mają przydziały o łącznym FTE powyżej 1,00. To ta sama reguła, która oznacza przydział jako konfliktowy. Liczymy osoby, nie przydziały.`}
          href={canSeeResources ? "/app/zasoby?status=over" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {canSeeProjects && (
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
        )}

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
