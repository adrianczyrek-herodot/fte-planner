import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/app/actions/auth";
import { dayIndex, timelineRange } from "@/lib/timeline";
import { TimelineGantt } from "./_components/timeline-gantt";

export const metadata: Metadata = {
  title: "Timeline — FTE Planner",
};

export default async function TimelinePage() {
  await requireCapability("viewProjects");

  const projectsRaw = await prisma.project.findMany({
    orderBy: { startDate: { sort: "asc", nulls: "last" } },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      // Obsada do rozwijania wiersza projektu + flaga konfliktu FTE.
      roles: {
        orderBy: [{ startMonth: "asc" }, { createdAt: "asc" }],
        select: {
          position: { select: { name: true } },
          assignments: {
            orderBy: [{ startMonth: "asc" }],
            select: {
              id: true,
              startMonth: true,
              endMonth: true,
              fte: true,
              isConflict: true,
              userId: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  // Przydziały mają granulację miesięczną, a pasek projektu dzienną. Pod-paski
  // osób rozciągamy więc na pełne miesiące: od 1. dnia miesiąca początkowego do
  // ostatniego dnia miesiąca końcowego. Inaczej wyglądałyby na przesunięte
  // względem paska projektu.
  const monthStartDay = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    return dayIndex(new Date(Date.UTC(y, m - 1, 1)));
  };
  const monthEndDay = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    return dayIndex(new Date(Date.UTC(y, m, 0)));
  };

  // Pasek Gantta wymaga obu dat; projekty niekompletne trafiają do tacki.
  const rows = projectsRaw
    .filter((p) => p.startDate && p.endDate)
    .map((p) => ({
      id: p.id,
      name: p.name,
      hasConflict: p.roles.some((r) => r.assignments.some((a) => a.isConflict)),
      startDay: dayIndex(p.startDate!),
      endDay: dayIndex(p.endDate!),
      people: p.roles.flatMap((r) =>
        r.assignments.map((a) => ({
          id: a.id,
          userId: a.userId,
          name: `${a.user.firstName} ${a.user.lastName}`,
          rolePosition: r.position.name,
          fte: Number(a.fte),
          startMonth: a.startMonth,
          endMonth: a.endMonth,
          startDay: monthStartDay(a.startMonth),
          endDay: monthEndDay(a.endMonth),
          isConflict: a.isConflict,
        }))
      ),
    }));

  // Projekty bez pełnych dat też są na liście po lewej — tylko bez paska.
  const undated = projectsRaw
    .filter((p) => !p.startDate || !p.endDate)
    .map((p) => ({ id: p.id, name: p.name }));

  const todayDay = dayIndex(new Date());
  const { rangeStartDay, totalDays } = timelineRange(
    rows.flatMap((r) => [r.startDay, r.endDay]),
    todayDay
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="text-muted-foreground">
          Każdy projekt ma własny wiersz. Przeciągnij pasek, aby przesunąć projekt w
          czasie; złap jego krawędź, aby zmienić datę rozpoczęcia lub zakończenia.
          Zmiany nie zapisują się same — zatwierdź je przyciskiem Zapisz.
        </p>
      </div>

      <TimelineGantt
        rangeStartDay={rangeStartDay}
        totalDays={totalDays}
        todayDay={todayDay}
        rows={rows}
        undated={undated}
      />
    </div>
  );
}
