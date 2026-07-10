import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/app/actions/auth";
import { formatDate, getProjectDueStatus } from "@/lib/project-status";
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

const statusLabels = {
  upcoming: "Przed terminem",
  overdue: "Po terminie",
  "no-due-date": "Brak terminu",
} as const;

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
    include: { attachments: { orderBy: { createdAt: "desc" } } },
  });

  if (!project) {
    notFound();
  }

  const status = getProjectDueStatus(project.dueDate);

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
          project={project}
          trigger={<Button variant="outline">Edytuj projekt</Button>}
        />
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Terminy</CardTitle>
          <CardDescription className="flex flex-col gap-1">
            <span>Termin (due date): {formatDate(project.dueDate)}</span>
            <span>Data zakończenia: {formatDate(project.endDate)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant={status === "overdue" ? "destructive" : "secondary"}>
            {statusLabels[status]}
          </Badge>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Załączniki</h2>
        <AttachmentUploadForm projectId={project.id} />
        <AttachmentList attachments={project.attachments} />
      </div>
    </div>
  );
}
