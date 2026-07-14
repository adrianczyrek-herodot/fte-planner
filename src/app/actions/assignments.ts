"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/app/actions/auth";
import { getMonthlyFte, recomputeConflicts } from "@/lib/assignments-core";
import {
  AssignmentFormState,
  AssignmentSchema,
} from "@/lib/validation/assignment";

function projectPath(projectId: string) {
  return `/app/projekty/${projectId}`;
}

// Agregat sumy FTE pracownika w danym miesiącu ze WSZYSTKICH jego przydziałów.
export async function getMonthlyFteSummary(userId: string, month: string) {
  await requireApprovedUser();
  return getMonthlyFte(prisma, userId, month);
}

// Tworzy lub aktualizuje przydział. Przy `assignmentId` edytujemy istniejący
// rekord (można zmienić pracownika, miesiąc i FTE); bez niego dodajemy nowy
// (jeden rekord na parę pracownik+projekt+miesiąc). Suma > 1.0 NIE blokuje
// zapisu — przydział zostaje, a grupa jest oznaczana jako konfliktowa.
export async function createOrUpdateAssignment(
  projectId: string,
  assignmentId: string | null,
  _state: AssignmentFormState,
  formData: FormData
): Promise<AssignmentFormState> {
  await requireApprovedUser();

  const validatedFields = AssignmentSchema.safeParse({
    userId: formData.get("userId"),
    month: formData.get("month"),
    fte: formData.get("fte"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { userId, month } = validatedFields.data;
  // Pole to Decimal(4,2) — normalizujemy do setnych, by uniknąć śmieci floata.
  const fte = Math.round(validatedFields.data.fte * 100) / 100;

  // Docelowy slot (pracownik+projekt+miesiąc) jest unikalny — sprawdzamy, czy
  // nie zajmuje go INNY przydział, żeby dać czytelny komunikat zamiast błędu DB.
  const slotOwner = await prisma.assignment.findUnique({
    where: { userId_projectId_month: { userId, projectId, month } },
    select: { id: true },
  });
  if (slotOwner && slotOwner.id !== assignmentId) {
    return {
      message: "Ten pracownik ma już przydział na ten miesiąc w tym projekcie.",
    };
  }

  if (assignmentId) {
    const existing = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { userId: true, month: true },
    });
    if (!existing) {
      return { message: "Przydział już nie istnieje." };
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { userId, month, fte },
    });

    // Edycja może przenieść przydział między grupami (zmiana pracownika/
    // miesiąca), więc przeliczamy konflikt w starej i nowej grupie.
    await recomputeConflicts(prisma, existing.userId, existing.month);
  } else {
    await prisma.assignment.create({
      data: { userId, projectId, month, fte },
    });
  }

  const conflict = await recomputeConflicts(prisma, userId, month);

  revalidatePath(projectPath(projectId));
  return { success: true, conflict };
}

export async function deleteAssignment(formData: FormData) {
  await requireApprovedUser();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new Error("Nieprawidłowe dane.");
  }

  const deleted = await prisma.assignment.delete({
    where: { id },
    select: { userId: true, month: true, projectId: true },
  });

  await recomputeConflicts(prisma, deleted.userId, deleted.month);

  revalidatePath(projectPath(deleted.projectId));
}
