import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/app/actions/auth";
import { monthRange, projectAnchorMonth, ym } from "@/lib/timeline";
import { TimelineBoard } from "./_components/timeline-board";

export const metadata: Metadata = {
  title: "Timeline — FTE Planner",
};

export default async function TimelinePage() {
  await requireApprovedUser();

  const projectsRaw = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      // Konflikt FTE czytany z istniejącej flagi (bez ponownego liczenia).
      assignments: { select: { isConflict: true } },
    },
  });

  const projects = projectsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    anchorMonth: projectAnchorMonth(p.startDate, p.endDate),
    hasConflict: p.assignments.some((a) => a.isConflict),
  }));

  const currentMonth = ym(new Date());
  const anchors = projects
    .map((p) => p.anchorMonth)
    .filter((m): m is string => m !== null);
  const months = monthRange(anchors, currentMonth);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="text-muted-foreground">
          Przeciągnij projekt na inny miesiąc, aby zmienić jego termin.
        </p>
      </div>

      <TimelineBoard
        months={months}
        currentMonth={currentMonth}
        projects={projects}
      />
    </div>
  );
}
