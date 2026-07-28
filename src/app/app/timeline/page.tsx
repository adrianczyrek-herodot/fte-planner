import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/app/actions/auth";
import { dayIndex, timelineRange } from "@/lib/timeline";
import { TimelineGantt } from "./_components/timeline-gantt";

export const metadata: Metadata = {
  title: "Timeline — FTE Planner",
};

export default async function TimelinePage() {
  await requireApprovedUser();

  const projectsRaw = await prisma.project.findMany({
    orderBy: { startDate: { sort: "asc", nulls: "last" } },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      // Konflikt FTE czytany z istniejącej flagi (bez ponownego liczenia).
      assignments: { select: { isConflict: true } },
    },
  });

  // Pasek Gantta wymaga obu dat; projekty niekompletne trafiają do tacki.
  const rows = projectsRaw
    .filter((p) => p.startDate && p.endDate)
    .map((p) => ({
      id: p.id,
      name: p.name,
      hasConflict: p.assignments.some((a) => a.isConflict),
      startDay: dayIndex(p.startDate!),
      endDay: dayIndex(p.endDate!),
    }));

  const incomplete = projectsRaw
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
          Przeciągnij pasek, aby przesunąć projekt; złap koniec, aby zmienić datę
          rozpoczęcia lub zakończenia.
        </p>
      </div>

      <TimelineGantt
        rangeStartDay={rangeStartDay}
        totalDays={totalDays}
        todayDay={todayDay}
        rows={rows}
        incomplete={incomplete}
      />
    </div>
  );
}
