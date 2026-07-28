import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FolderKanban,
  Users,
} from "lucide-react";

import { requireApprovedUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { ym } from "@/lib/timeline";
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
  const session = await requireApprovedUser();
  const user = session.user;

  const now = new Date();
  const currentMonth = ym(now);

  const [projectCount, employeeCount, assignmentCount, overloaded, upcoming] =
    await Promise.all([
      prisma.project.count(),
      prisma.user.count({ where: { status: "approved" } }),
      prisma.assignment.count({ where: { month: currentMonth } }),
      prisma.assignment.groupBy({
        by: ["userId"],
        where: { month: currentMonth, isConflict: true },
      }),
      prisma.project.findMany({
        where: { endDate: { gte: now } },
        orderBy: { endDate: "asc" },
        take: 5,
        select: { id: true, name: true, startDate: true, endDate: true },
      }),
    ]);

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
          value={overloaded.length}
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
            Rola: {user.role === "admin" ? "administrator" : "użytkownik"}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
