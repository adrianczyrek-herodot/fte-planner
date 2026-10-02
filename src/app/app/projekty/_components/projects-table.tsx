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
import { InfoHint } from "@/components/info-hint";
import { Badge } from "@/components/ui/badge";
import {
  getProjectDueStatus,
  formatBudget,
  formatDate,
  projectStatusMeta,
} from "@/lib/project-status";
import type { ProjectLinkKey } from "@/lib/validation/project";
import { ProjectRowActions } from "./project-row-actions";

type Project = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  links: Record<ProjectLinkKey, string | null>;
  assigneeCount: number;
  attachmentCount: number;
  hasConflict: boolean;
};

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
            <TableHead>Budżet</TableHead>
            <TableHead>
              <span className="flex items-center gap-1.5">
                Status
                <InfoHint label="Jak liczymy: Status">
                  Wynika wyłącznie z daty zakończenia: data dzisiejsza lub
                  przyszła to „Przed terminem”, przeszła — „Po terminie”.
                  Nie ma tu żadnej informacji o postępie prac ani o tym, czy
                  projekt faktycznie się zakończył.
                </InfoHint>
              </span>
            </TableHead>
            <TableHead>
              <span className="flex items-center gap-1.5">
                Przypisani
                <InfoHint label="Jak liczymy: Przypisani">
                  Liczba różnych osób obsadzonych na rolach tego projektu, w
                  całym jego okresie. Jedna osoba na dwóch rolach liczy się raz.
                </InfoHint>
              </span>
            </TableHead>
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
                <TableCell className="tabular-nums">
                  {formatBudget(project.budget)}
                </TableCell>
                <TableCell>
                  <Badge variant={projectStatusMeta[status].variant}>
                    {projectStatusMeta[status].label}
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
                      budget: project.budget,
                      ...project.links,
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
