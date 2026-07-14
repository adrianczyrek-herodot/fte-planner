import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getProjectDueStatus, formatDate } from "@/lib/project-status";
import { ProjectRowActions } from "./project-row-actions";

type Project = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  assigneeCount: number;
  attachmentCount: number;
  hasConflict: boolean;
};

const statusLabels = {
  upcoming: "Przed terminem",
  overdue: "Po terminie",
  "no-due-date": "Brak terminu",
} as const;

export function ProjectsTable({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Brak projektów spełniających kryteria.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nazwa</TableHead>
            <TableHead>Data rozpoczęcia</TableHead>
            <TableHead>Data zakończenia</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Przypisani</TableHead>
            <TableHead>Załączniki</TableHead>
            <TableHead className="w-0">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const status = getProjectDueStatus(project.endDate);
            return (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-1.5">
                    <Link
                      href={`/app/projekty/${project.id}`}
                      className="hover:underline"
                    >
                      {project.name}
                    </Link>
                    {project.hasConflict && (
                      <AlertTriangle
                        className="size-4 text-destructive"
                        aria-label="Konflikt FTE: ktoś przypisany jest przeciążony"
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell>{formatDate(project.startDate)}</TableCell>
                <TableCell>{formatDate(project.endDate)}</TableCell>
                <TableCell>
                  <Badge variant={status === "overdue" ? "destructive" : "secondary"}>
                    {statusLabels[status]}
                  </Badge>
                </TableCell>
                <TableCell>{project.assigneeCount}</TableCell>
                <TableCell>{project.attachmentCount}</TableCell>
                <TableCell>
                  <ProjectRowActions
                    project={{
                      id: project.id,
                      name: project.name,
                      description: project.description,
                      startDate: project.startDate,
                      endDate: project.endDate,
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
