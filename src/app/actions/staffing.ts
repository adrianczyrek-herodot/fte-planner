"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { formatYmdRange, parseYmd, ymd } from "@/lib/timeline";
import { requireCapability } from "@/app/actions/auth";
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

/**
 * Zmiana obsady dotyka nie tylko strony projektu: lista projektów pokazuje
 * liczbę przypisanych i ikonę konfliktu, oś czasu rozwija się do osób, a widok
 * Zasobów liczy obłożenie. Odświeżamy je razem — inaczej lista potrafi pokazać
 * nieaktualny stan.
 */
function revalidateStaffing(projectId: string) {
  revalidatePath(projectPath(projectId));
  revalidatePath("/app/projekty");
  revalidatePath("/app/timeline");
  revalidatePath("/app/zasoby");
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// --- Zapotrzebowanie na rolę ------------------------------------------------

export async function createProjectRole(
  projectId: string,
  _state: ProjectRoleFormState,
  formData: FormData
): Promise<ProjectRoleFormState> {
  await requireCapability("manageStaffing");

  const v = ProjectRoleSchema.safeParse({
    positionId: formData.get("positionId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    requiredFte: formData.get("requiredFte"),
    requiredPeople: formData.get("requiredPeople"),
  });
  if (!v.success) return { errors: z.flattenError(v.error).fieldErrors };

  await prisma.projectRole.create({
    data: {
      projectId,
      positionId: v.data.positionId,
      startDate: parseYmd(v.data.startDate),
      endDate: parseYmd(v.data.endDate),
      requiredFte: round2(v.data.requiredFte),
      requiredPeople: v.data.requiredPeople,
    },
  });

  revalidateStaffing(projectId);
  return { success: true };
}

export async function updateProjectRole(
  _state: ProjectRoleFormState,
  formData: FormData
): Promise<ProjectRoleFormState> {
  await requireCapability("manageStaffing");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { message: "Nieprawidłowe dane." };

  const v = ProjectRoleSchema.safeParse({
    positionId: formData.get("positionId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    requiredFte: formData.get("requiredFte"),
    requiredPeople: formData.get("requiredPeople"),
  });
  if (!v.success) return { errors: z.flattenError(v.error).fieldErrors };

  const role = await prisma.projectRole.update({
    where: { id },
    data: {
      positionId: v.data.positionId,
      startDate: parseYmd(v.data.startDate),
      endDate: parseYmd(v.data.endDate),
      requiredFte: round2(v.data.requiredFte),
      requiredPeople: v.data.requiredPeople,
    },
    select: { projectId: true },
  });

  revalidateStaffing(role.projectId);
  return { success: true };
}

export async function deleteProjectRole(formData: FormData) {
  await requireCapability("manageStaffing");

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

  revalidateStaffing(role.projectId);
}

// --- Obsada roli ------------------------------------------------------------

export async function createOrUpdateAssignment(
  projectRoleId: string,
  assignmentId: string | null,
  _state: AssignmentFormState,
  formData: FormData
): Promise<AssignmentFormState> {
  await requireCapability("manageStaffing");

  const v = AssignmentSchema.safeParse({
    userId: formData.get("userId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    fte: formData.get("fte"),
  });
  if (!v.success) return { errors: z.flattenError(v.error).fieldErrors };

  const role = await prisma.projectRole.findUnique({
    where: { id: projectRoleId },
    select: { projectId: true, startDate: true, endDate: true },
  });
  if (!role) return { message: "Rola już nie istnieje." };

  const { userId } = v.data;
  const startDate = parseYmd(v.data.startDate);
  const endDate = parseYmd(v.data.endDate);

  // Przydział poza okresem roli nie ma czego obsadzać, a w pokryciu i tak by
  // się nie liczył — zatrzymujemy go od razu, z podaniem okresu roli.
  if (startDate < role.startDate || endDate > role.endDate) {
    const period = formatYmdRange(ymd(role.startDate), ymd(role.endDate));
    return {
      errors: {
        ...(startDate < role.startDate
          ? { startDate: [`Przydział musi mieścić się w okresie roli (${period}).`] }
          : {}),
        ...(endDate > role.endDate
          ? { endDate: [`Przydział musi mieścić się w okresie roli (${period}).`] }
          : {}),
      },
    };
  }
  const fte = round2(v.data.fte);
  const affected = new Set<string>([userId]);

  const existing = assignmentId
    ? await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { userId: true, projectRoleId: true },
      })
    : null;
  if (assignmentId && (!existing || existing.projectRoleId !== projectRoleId)) {
    return { message: "Przydział już nie istnieje." };
  }

  // Nowych osób przypisujemy tylko spośród aktywnych pracowników. Wyjątkiem jest
  // edycja przydziału bez zmiany osoby — historia nieaktywnej osoby zostaje.
  if (existing?.userId !== userId) {
    const person = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (person?.status !== "approved") {
      return { errors: { userId: ["Wybierz aktywnego pracownika."] } };
    }
  }

  if (assignmentId && existing) {
    affected.add(existing.userId);
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { userId, startDate, endDate, fte },
    });
  } else {
    await prisma.assignment.create({
      data: { projectRoleId, userId, startDate, endDate, fte },
    });
  }

  for (const uid of affected) await recomputeUserConflicts(prisma, uid);

  revalidateStaffing(role.projectId);
  return { success: true };
}

export async function deleteAssignment(formData: FormData) {
  await requireCapability("manageStaffing");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const deleted = await prisma.assignment.delete({
    where: { id },
    select: { userId: true, projectRole: { select: { projectId: true } } },
  });

  await recomputeUserConflicts(prisma, deleted.userId);
  revalidateStaffing(deleted.projectRole.projectId);
}
