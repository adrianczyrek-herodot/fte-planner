import Link from "next/link";

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

type Project = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const status = getProjectDueStatus(project.endDate);
            return (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/app/projekty/${project.id}`}
                    className="hover:underline"
                  >
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(project.startDate)}</TableCell>
                <TableCell>{formatDate(project.endDate)}</TableCell>
                <TableCell>
                  <Badge variant={status === "overdue" ? "destructive" : "secondary"}>
                    {statusLabels[status]}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
