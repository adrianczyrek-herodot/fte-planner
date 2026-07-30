import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/app/actions/auth";
import {
  formatDate,
  getProjectDueStatus,
  projectStatusMeta,
} from "@/lib/project-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectFormDialog } from "../_components/project-form-dialog";
import { AttachmentUploadForm } from "./_components/attachment-upload-form";
import { AttachmentList } from "./_components/attachment-list";
import { AssignmentForm } from "./_components/assignment-form";
import { AssignmentsList } from "./_components/assignments-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: project ? `${project.name} — FTE Planner` : "Projekt — FTE Planner" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Layouts don't reliably re-render on client-side navigation (Next.js
  // partial rendering), so re-check auth here too rather than relying
  // solely on the shared /app layout.
  await requireApprovedUser();

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      assignments: {
        orderBy: [{ month: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          userId: true,
          month: true,
          fte: true,
          isConflict: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const status = getProjectDueStatus(project.endDate);

  // Lista pracowników do przydzielenia + serializacja Decimal → string dla
  // komponentów prezentacyjnych.
  const employees = await prisma.user.findMany({
    where: { status: "approved" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  const assignments = project.assignments.map((a) => ({
    id: a.id,
    userId: a.userId,
    month: a.month,
    fte: a.fte.toString(),
    isConflict: a.isConflict,
    user: a.user,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-muted-foreground">
            {project.description || "Brak opisu."}
          </p>
        </div>
        <ProjectFormDialog
          mode="edit"
          // Tylko proste pola — obiekt `project` niesie relacje (assignments)
          // z wartościami Decimal, których nie można serializować do klienta.
          project={{
            id: project.id,
            name: project.name,
            description: project.description,
            startDate: project.startDate,
            endDate: project.endDate,
            budget: project.budget != null ? Number(project.budget) : null,
          }}
          trigger={<Button variant="outline">Edytuj projekt</Button>}
        />
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Terminy i budżet</CardTitle>
          <CardDescription className="flex flex-col gap-1">
            <span>Data rozpoczęcia: {formatDate(project.startDate)}</span>
            <span>Data zakończenia: {formatDate(project.endDate)}</span>
            <span>
              Budżet:{" "}
              {project.budget != null
                ? new Intl.NumberFormat("pl-PL", {
                    style: "currency",
                    currency: "PLN",
                    maximumFractionDigits: 0,
                  }).format(Number(project.budget))
                : "—"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant={projectStatusMeta[status].variant}>
            {projectStatusMeta[status].label}
          </Badge>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Przydziały</h2>
        <AssignmentForm projectId={project.id} employees={employees} />
        <AssignmentsList
          assignments={assignments}
          projectId={project.id}
          employees={employees}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Załączniki</h2>
        <AttachmentUploadForm projectId={project.id} />
        <AttachmentList attachments={project.attachments} />
      </div>
    </div>
  );
}
