import type { Metadata } from "next";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "./_components/project-form-dialog";
import { ProjectsTable } from "./_components/projects-table";
import { StatusFilter } from "./_components/status-filter";

export const metadata: Metadata = {
  title: "Projekty — FTE Planner",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Layouts don't reliably re-render on client-side navigation (Next.js
  // partial rendering), so re-check auth here too rather than relying
  // solely on the shared /app layout.
  await requireApprovedUser();

  const { status } = await searchParams;
  const now = new Date();

  const where =
    status === "upcoming"
      ? { endDate: { gte: now } }
      : status === "overdue"
        ? { endDate: { lt: now } }
        : {};

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projekty</h1>
          <p className="text-muted-foreground">
            Zarządzaj projektami i ich terminami.
          </p>
        </div>
        <ProjectFormDialog mode="create" trigger={<Button>Dodaj projekt</Button>} />
      </div>

      <Suspense fallback={null}>
        <StatusFilter initialStatus={status ?? "all"} />
      </Suspense>

      <ProjectsTable projects={projects} />
    </div>
  );
}
