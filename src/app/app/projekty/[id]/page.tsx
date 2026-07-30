import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/app/actions/auth";
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
import { roleCoverage } from "@/lib/staffing";
import { ProjectFormDialog } from "../_components/project-form-dialog";
import { AttachmentUploadForm } from "./_components/attachment-upload-form";
import { AttachmentList } from "./_components/attachment-list";
import { StaffingSection } from "./_components/staffing-section";

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
  await requireManager();

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      roles: {
        orderBy: [{ startMonth: "asc" }, { createdAt: "asc" }],
        include: {
          assignments: {
            orderBy: [{ startMonth: "asc" }],
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const status = getProjectDueStatus(project.endDate);

  const employees = await prisma.user.findMany({
    where: { status: "approved" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, skills: true },
  });

  // Serializacja Decimal → number/string + pokrycie/luka obsady per miesiąc.
  const roles = project.roles.map((r) => {
    const assignments = r.assignments.map((a) => ({
      id: a.id,
      userId: a.userId,
      startMonth: a.startMonth,
      endMonth: a.endMonth,
      fte: a.fte.toString(),
      isConflict: a.isConflict,
      name: `${a.user.firstName} ${a.user.lastName}`,
    }));
    const coverage = roleCoverage(
      {
        startMonth: r.startMonth,
        endMonth: r.endMonth,
        requiredFte: Number(r.requiredFte),
      },
      r.assignments.map((a) => ({
        id: a.id,
        startMonth: a.startMonth,
        endMonth: a.endMonth,
        fte: Number(a.fte),
      }))
    );
    return {
      id: r.id,
      position: r.position,
      startMonth: r.startMonth,
      endMonth: r.endMonth,
      requiredFte: r.requiredFte.toString(),
      hasGap: coverage.some((c) => c.gap > 0),
      coverage,
      assignments,
    };
  });

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

      <StaffingSection projectId={project.id} roles={roles} employees={employees} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Załączniki</h2>
        <AttachmentUploadForm projectId={project.id} />
        <AttachmentList attachments={project.attachments} />
      </div>
    </div>
  );
}
