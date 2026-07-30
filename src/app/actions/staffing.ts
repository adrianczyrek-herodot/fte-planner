"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/app/actions/auth";
import { recomputeUserConflicts } from "@/lib/assignments-core";
import {
  AssignmentFormState,
  AssignmentSchema,
  ProjectRoleFormState,
  ProjectRoleSchema,
} from "@/lib/validation/staffing";

function projectPath(projectId: string) {
  return `/app/projekty/${projectId}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// --- Zapotrzebowanie na rolę ------------------------------------------------

export async function createProjectRole(
  projectId: string,
  _state: ProjectRoleFormState,
  formData: FormData
): Promise<ProjectRoleFormState> {
  await requireManager();

  const v = ProjectRoleSchema.safeParse({
    position: formData.get("position"),
    startMonth: formData.get("startMonth"),
    endMonth: formData.get("endMonth"),
    requiredFte: formData.get("requiredFte"),
  });
  if (!v.success) return { errors: z.flattenError(v.error).fieldErrors };

  await prisma.projectRole.create({
    data: {
      projectId,
      position: v.data.position,
      startMonth: v.data.startMonth,
      endMonth: v.data.endMonth,
      requiredFte: round2(v.data.requiredFte),
    },
  });

  revalidatePath(projectPath(projectId));
  return { success: true };
}

export async function updateProjectRole(
  _state: ProjectRoleFormState,
  formData: FormData
): Promise<ProjectRoleFormState> {
  await requireManager();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { message: "Nieprawidłowe dane." };

  const v = ProjectRoleSchema.safeParse({
    position: formData.get("position"),
    startMonth: formData.get("startMonth"),
    endMonth: formData.get("endMonth"),
    requiredFte: formData.get("requiredFte"),
  });
  if (!v.success) return { errors: z.flattenError(v.error).fieldErrors };

  const role = await prisma.projectRole.update({
    where: { id },
    data: {
      position: v.data.position,
      startMonth: v.data.startMonth,
      endMonth: v.data.endMonth,
      requiredFte: round2(v.data.requiredFte),
    },
    select: { projectId: true },
  });

  revalidatePath(projectPath(role.projectId));
  return { success: true };
}

export async function deleteProjectRole(formData: FormData) {
  await requireManager();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const role = await prisma.projectRole.findUnique({
    where: { id },
    select: { projectId: true, assignments: { select: { userId: true } } },
  });
  if (!role) return;

  const affectedUsers = [...new Set(role.assignments.map((a) => a.userId))];

  // Kasacja roli usuwa kaskadowo jej obsadę → przeliczamy konflikt dotkniętych osób.
  await prisma.projectRole.delete({ where: { id } });
  for (const userId of affectedUsers) await recomputeUserConflicts(prisma, userId);

  revalidatePath(projectPath(role.projectId));
}

// --- Obsada roli ------------------------------------------------------------

export async function createOrUpdateAssignment(
  projectRoleId: string,
  assignmentId: string | null,
  _state: AssignmentFormState,
  formData: FormData
): Promise<AssignmentFormState> {
  await requireManager();

  const v = AssignmentSchema.safeParse({
    userId: formData.get("userId"),
    startMonth: formData.get("startMonth"),
    endMonth: formData.get("endMonth"),
    fte: formData.get("fte"),
  });
  if (!v.success) return { errors: z.flattenError(v.error).fieldErrors };

  const role = await prisma.projectRole.findUnique({
    where: { id: projectRoleId },
    select: { projectId: true },
  });
  if (!role) return { message: "Rola już nie istnieje." };

  const { userId, startMonth, endMonth } = v.data;
  const fte = round2(v.data.fte);
  const affected = new Set<string>([userId]);

  if (assignmentId) {
    const existing = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { userId: true },
    });
    if (!existing) return { message: "Przydział już nie istnieje." };
    affected.add(existing.userId);
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { userId, startMonth, endMonth, fte },
    });
  } else {
    await prisma.assignment.create({
      data: { projectRoleId, userId, startMonth, endMonth, fte },
    });
  }

  for (const uid of affected) await recomputeUserConflicts(prisma, uid);

  revalidatePath(projectPath(role.projectId));
  return { success: true };
}

export async function deleteAssignment(formData: FormData) {
  await requireManager();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const deleted = await prisma.assignment.delete({
    where: { id },
    select: { userId: true, projectRole: { select: { projectId: true } } },
  });

  await recomputeUserConflicts(prisma, deleted.userId);
  revalidatePath(projectPath(deleted.projectRole.projectId));
}
