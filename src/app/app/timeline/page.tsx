import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/session";
import { dayIndex, timelineRange, todayInPoland } from "@/lib/timeline";
import { InfoHint } from "@/components/info-hint";
import { TimelineGantt } from "./_components/timeline-gantt";

export const metadata: Metadata = {
  title: "Timeline — FTE Planner",
};

export default async function TimelinePage() {
  await requireCapability("viewProjects");

  const projectsRaw = await prisma.project.findMany({
    // Drugi i trzeci klucz dają stałą kolejność — przy samej dacie dwa projekty
    // startujące tego samego dnia zamieniały się miejscami po każdym zapisie.
    orderBy: [{ startDate: { sort: "asc", nulls: "last" } }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      // Obsada do rozwijania wiersza projektu + flaga konfliktu FTE.
      roles: {
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
        select: {
          position: { select: { name: true } },
          assignments: {
            orderBy: [{ startDate: "asc" }],
            select: {
              id: true,
              startDate: true,
              endDate: true,
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
          // Pasek osoby pokrywa się teraz z jej faktycznym okresem, więc nie
          // trzeba go już rozciągać na pełne miesiące, żeby pasował do paska
          // projektu.
          startDay: dayIndex(a.startDate),
          endDay: dayIndex(a.endDate),
          isConflict: a.isConflict,
        }))
      ),
    }));

  // Projekty bez pełnych dat też są na liście po lewej — tylko bez paska.
  const undated = projectsRaw
    .filter((p) => !p.startDate || !p.endDate)
    .map((p) => ({ id: p.id, name: p.name }));

  const todayDay = dayIndex(todayInPoland());
  const { rangeStartDay, totalDays } = timelineRange(
    rows.flatMap((r) => [r.startDay, r.endDay]),
    todayDay
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          Timeline
          <InfoHint label="Jak czytać Timeline">
            Jeden wiersz to jeden projekt, a pasek pokrywa jego okres co do dnia.
            Rozwinięcie wiersza pokazuje obsadzone osoby — ich paski też są
            dzienne i pokrywają się dokładnie z okresem przydziału. Czerwony
            trójkąt oznacza, że ktoś obsadzony na tym projekcie ma w którymś
            dniu roboczym sumę FTE powyżej pełnego etatu; dotyczy to całego jego
            obłożenia, także z innych projektów. Projekty bez dat trafiają na
            listę pod wykresem.
          </InfoHint>
        </h1>
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
