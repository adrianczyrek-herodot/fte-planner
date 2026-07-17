"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { moveProjectToMonth } from "@/app/actions/projects";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/timeline";

type Project = {
  id: string;
  name: string;
  anchorMonth: string | null;
  hasConflict: boolean;
};

export function TimelineBoard({
  months,
  currentMonth,
  projects,
}: {
  months: string[];
  currentMonth: string;
  projects: Project[];
}) {
  // Pozycje kafelków trzymamy lokalnie (optymistycznie), a akcja serwerowa
  // utrwala zmianę i rewaliduje listę projektów.
  const [positions, setPositions] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(projects.map((p) => [p.id, p.anchorMonth]))
  );
  const [dragOver, setDragOver] = useState<string | null>(null);

  async function drop(projectId: string, month: string) {
    const previous = positions[projectId];
    if (previous === month) return;

    setPositions((s) => ({ ...s, [projectId]: month }));
    try {
      await moveProjectToMonth(projectId, month);
    } catch {
      // Cofnij w razie błędu (np. brak uprawnień).
      setPositions((s) => ({ ...s, [projectId]: previous }));
    }
  }

  function Tile({ project }: { project: Project }) {
    return (
      <div
        draggable
        data-project-id={project.id}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", project.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className="cursor-grab rounded-md border bg-card p-2 text-sm shadow-sm active:cursor-grabbing"
      >
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-medium" title={project.name}>
            {project.name}
          </span>
          {project.hasConflict && (
            <Badge
              variant="destructive"
              className="shrink-0 px-1"
              aria-label="Konflikt FTE: ktoś przypisany jest przeciążony"
            >
              <AlertTriangle className="size-3" />
            </Badge>
          )}
        </div>
      </div>
    );
  }

  const unscheduled = projects.filter((p) => positions[p.id] === null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {unscheduled.length > 0 && (
        <div className="flex w-56 shrink-0 flex-col gap-2 rounded-lg border border-dashed p-2">
          <div className="text-xs font-medium text-muted-foreground">Bez terminu</div>
          {unscheduled.map((p) => (
            <Tile key={p.id} project={p} />
          ))}
        </div>
      )}

      {months.map((month) => {
        const inMonth = projects.filter((p) => positions[p.id] === month);
        return (
          <div
            key={month}
            data-month={month}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(month);
            }}
            onDragLeave={() =>
              setDragOver((m) => (m === month ? null : m))
            }
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) drop(id, month);
            }}
            className={cn(
              "flex w-56 shrink-0 flex-col gap-2 rounded-lg border p-2",
              month === currentMonth && "border-primary/40 bg-muted/30",
              dragOver === month && "ring-2 ring-primary"
            )}
          >
            <div className="text-xs font-medium text-muted-foreground capitalize">
              {formatMonthLabel(month)}
            </div>
            {inMonth.map((p) => (
              <Tile key={p.id} project={p} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
