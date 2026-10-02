import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { ymd } from "@/lib/timeline";
import { requireCapability } from "@/app/actions/auth";
import { can } from "@/lib/permissions";
import {
  assignmentCostWithRates,
  projectCostSummary,
  toGrosze,
  type AssignmentCostMonth,
} from "@/lib/cost";
import {
  formatBudget,
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
import { peopleCoverage, roleCoverageSummary } from "@/lib/staffing";
import { ProjectFormDialog } from "../_components/project-form-dialog";
import { AttachmentUploadForm } from "./_components/attachment-upload-form";
import { AttachmentList } from "./_components/attachment-list";
import { StaffingSection } from "./_components/staffing-section";
import { ProjectLinks } from "./_components/project-links";
import { ProjectCosts } from "./_components/project-costs";

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
  const { role } = await requireCapability("viewProjects");

  // Dane kosztowe pobieramy TYLKO dla uprawnionych roli. Ukrycie ich w widoku
  // nie wystarcza: cokolwiek trafi do zapytania, trafia też do payloadu strony
  // i da się to odczytać w źródle.
  const canSeeCosts = can(role, "viewRates");

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      roles: {
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
        include: {
          position: { select: { id: true, name: true } },
          assignments: {
            orderBy: [{ startDate: "asc" }],
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

  const employeesRaw = await prisma.user.findMany({
    where: { status: "approved" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      skills: { select: { name: true }, orderBy: { name: "asc" } },
    },
  });

  const positions = await prisma.position.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const employees = employeesRaw.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    skills: e.skills.map((s) => s.name),
  }));

  // Serializacja Decimal → number/string + pokrycie/luka obsady per miesiąc.
  const roles = project.roles.map((r) => {
    const assignments = r.assignments.map((a) => ({
      id: a.id,
      userId: a.userId,
      startDate: ymd(a.startDate),
      endDate: ymd(a.endDate),
      fte: a.fte.toString(),
      isConflict: a.isConflict,
      name: `${a.user.firstName} ${a.user.lastName}`,
    }));
    const summary = roleCoverageSummary(
      {
        startDate: r.startDate,
        endDate: r.endDate,
        requiredFte: Number(r.requiredFte),
      },
      r.assignments.map((a) => ({
        id: a.id,
        startDate: a.startDate,
        endDate: a.endDate,
        fte: Number(a.fte),
      }))
    );
    return {
      id: r.id,
      position: r.position.name,
      positionId: r.positionId,
      startDate: ymd(r.startDate),
      endDate: ymd(r.endDate),
      requiredFte: r.requiredFte.toString(),
      requiredPeople: r.requiredPeople != null ? String(r.requiredPeople) : "",
      people: peopleCoverage(r.requiredPeople, r.assignments),
      coverage: summary.months,
      percent: summary.percent,
      hasWorkingDays: summary.hasWorkingDays,
      // Przydziały wystające poza okres roli — liczymy z nich tylko część w
      // okresie roli, więc warto o nich wiedzieć (np. po skróceniu roli).
      outsideCount: r.assignments.filter(
        (a) => a.startDate < r.startDate || a.endDate > r.endDate
      ).length,
      status: summary.status,
      hasGap: summary.hasGap,
      hasSurplus: summary.hasSurplus,
      assignments,
    };
  });

  // --- Warstwa kosztowa (tylko dla uprawnionych) ---------------------------
  let costs: {
    people: Parameters<typeof ProjectCosts>[0]["people"];
    items: Parameters<typeof ProjectCosts>[0]["items"];
    summary: Parameters<typeof ProjectCosts>[0]["summary"];
  } | null = null;

  if (canSeeCosts) {
    const assignments = project.roles.flatMap((r) =>
      r.assignments.map((a) => ({
        id: a.id,
        userId: a.userId,
        name: `${a.user.firstName} ${a.user.lastName}`,
        rolePosition: r.position.name,
        positionId: r.positionId,
        startDate: a.startDate,
        endDate: a.endDate,
        fte: Number(a.fte),
      }))
    );

    const [employeeRates, positionRates, costItems] = await Promise.all([
      prisma.employeeRate.findMany({
        where: { userId: { in: [...new Set(assignments.map((a) => a.userId))] } },
        select: { userId: true, hourlyRate: true, validFrom: true },
      }),
      prisma.positionRate.findMany({
        where: { positionId: { in: [...new Set(assignments.map((a) => a.positionId))] } },
        select: { positionId: true, hourlyRate: true, validFrom: true },
      }),
      prisma.projectCostItem.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, category: true, amount: true },
      }),
    ]);

    const ratesByUser = new Map<string, { grosze: number; validFrom: Date }[]>();
    for (const r of employeeRates) {
      const list = ratesByUser.get(r.userId) ?? [];
      list.push({ grosze: toGrosze(Number(r.hourlyRate)), validFrom: r.validFrom });
      ratesByUser.set(r.userId, list);
    }
    const ratesByPosition = new Map<string, { grosze: number; validFrom: Date }[]>();
    for (const r of positionRates) {
      const list = ratesByPosition.get(r.positionId) ?? [];
      list.push({ grosze: toGrosze(Number(r.hourlyRate)), validFrom: r.validFrom });
      ratesByPosition.set(r.positionId, list);
    }

    const allMonths: AssignmentCostMonth[] = [];
    const people = assignments.map((a) => {
      const months = assignmentCostWithRates(
        a,
        ratesByUser.get(a.userId) ?? [],
        ratesByPosition.get(a.positionId) ?? []
      );
      allMonths.push(...months);
      return {
        assignmentId: a.id,
        userId: a.userId,
        name: a.name,
        rolePosition: a.rolePosition,
        startDate: ymd(a.startDate),
        endDate: ymd(a.endDate),
        fte: a.fte,
        hours: Math.round(months.reduce((sum, m) => sum + m.hours, 0) * 100) / 100,
        grosze: months.reduce((sum, m) => sum + m.grosze, 0),
        monthsWithoutRate: months.filter((m) => m.missingRate).map((m) => m.month),
        // Źródło stawki pokazujemy, gdy jest jednolite dla całego przydziału.
        rateSource: months.every((m) => m.rateSource !== "position" && !m.missingRate) &&
          months.some((m) => m.rateSource === "employee")
          ? ("employee" as const)
          : months.some((m) => m.rateSource === "position")
            ? ("position" as const)
            : null,
      };
    });

    costs = {
      people,
      items: costItems.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        amount: String(i.amount),
      })),
      summary: projectCostSummary(
        allMonths,
        costItems.map((i) => toGrosze(Number(i.amount))),
        project.budget != null ? toGrosze(Number(project.budget)) : null
      ),
    };
  }

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
            projectCardUrl: project.projectCardUrl,
            riskCardUrl: project.riskCardUrl,
            confluenceUrl: project.confluenceUrl,
            miroUrl: project.miroUrl,
            domainUrl: project.domainUrl,
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
              Budżet: {formatBudget(project.budget as number | null)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant={projectStatusMeta[status].variant}>
            {projectStatusMeta[status].label}
          </Badge>
        </CardContent>
      </Card>

      <StaffingSection
        projectId={project.id}
        roles={roles}
        employees={employees}
        positions={positions}
      />

      {costs && (
        <ProjectCosts
          projectId={project.id}
          people={costs.people}
          items={costs.items}
          summary={costs.summary}
        />
      )}

      <ProjectLinks links={project} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Załączniki</h2>
        <AttachmentUploadForm projectId={project.id} />
        <AttachmentList attachments={project.attachments} />
      </div>
    </div>
  );
}
