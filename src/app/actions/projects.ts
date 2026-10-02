"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/app/actions/auth";
import { parseYmd } from "@/lib/timeline";
import { recomputeUserConflicts } from "@/lib/assignments-core";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_LABEL,
  PROJECT_LINK_FIELDS,
  ProjectSchema,
  ProjectFormState,
} from "@/lib/validation/project";
import { ProjectRoleSchema } from "@/lib/validation/staffing";

// Role deklarowane od razu przy zakładaniu projektu — zapotrzebowanie ma
// istnieć, zanim ktokolwiek zostanie przypisany. Formularz wysyła je jako JSON
// w jednym polu, bo liczba wierszy jest zmienna.
const DraftRolesSchema = z.array(ProjectRoleSchema).max(20, {
  error: "Zbyt wiele ról naraz — dodaj pozostałe na stronie projektu.",
});

function parseDraftRoles(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim() === "" || raw.trim() === "[]") {
    return { roles: [] as z.infer<typeof DraftRolesSchema> };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Nie udało się odczytać listy ról." };
  }
  const v = DraftRolesSchema.safeParse(parsed);
  if (!v.success) {
    const first = v.error.issues[0];
    const row = typeof first?.path?.[0] === "number" ? first.path[0] + 1 : null;
    return {
      error: row
        ? `Rola ${row}: ${first.message}`
        : (first?.message ?? "Nieprawidłowe dane roli."),
    };
  }
  return { roles: v.data };
}

const PROJECTS_PATH = "/app/projekty";
const TIMELINE_PATH = "/app/timeline";

export async function createProject(
  _state: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireCapability("manageProjects");

  const validatedFields = ProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    budget: formData.get("budget"),
    ...Object.fromEntries(
      PROJECT_LINK_FIELDS.map((f) => [f.key, formData.get(f.key)])
    ),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const draft = parseDraftRoles(formData.get("rolesJson"));
  if (draft.error) {
    return { message: draft.error };
  }

  const { name, description, startDate, endDate, budget, ...links } =
    validatedFields.data;

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      startDate,
      endDate,
      budget,
      ...links,
      roles: {
        create: draft.roles!.map((r) => ({
          positionId: r.positionId,
          startDate: parseYmd(r.startDate),
          endDate: parseYmd(r.endDate),
          requiredFte: Math.round(r.requiredFte * 100) / 100,
          requiredPeople: r.requiredPeople,
        })),
      },
    },
  });

  revalidatePath(PROJECTS_PATH);
  revalidatePath(TIMELINE_PATH);
  redirect(`/app/projekty/${project.id}`);
}

export async function updateProject(
  _state: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireCapability("manageProjects");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { message: "Nieprawidłowe dane." };
  }

  const validatedFields = ProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    budget: formData.get("budget"),
    ...Object.fromEntries(
      PROJECT_LINK_FIELDS.map((f) => [f.key, formData.get(f.key)])
    ),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { name, description, startDate, endDate, budget, ...links } =
    validatedFields.data;

  await prisma.project.update({
    where: { id },
    data: {
      name,
      description: description || null,
      startDate,
      endDate,
      budget,
      ...links,
    },
  });

  revalidatePath(PROJECTS_PATH);
  revalidatePath(`${PROJECTS_PATH}/${id}`);
  return { success: true };
}

export type AttachmentUploadState = { message?: string } | undefined;

export async function uploadAttachment(
  projectId: string,
  _state: AttachmentUploadState,
  formData: FormData
): Promise<AttachmentUploadState> {
  await requireCapability("manageProjects");

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { message: "Wybierz plik do przesłania." };
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { message: `Plik jest zbyt duży (maksymalnie ${MAX_ATTACHMENT_LABEL}).` };
  }

  // Storage bywa nieskonfigurowany (brak BLOB_READ_WRITE_TOKEN) albo chwilowo
  // niedostępny. Bez tego catcha wyjątek z server action ubija cały render
  // strony projektu — a to tylko nieudany upload jednego pliku.
  let blob;
  try {
    blob = await put(`projects/${projectId}/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    });
  } catch (error) {
    console.error("[uploadAttachment] blob put failed", error);
    return {
      message:
        "Nie udało się przesłać pliku — magazyn plików jest chwilowo niedostępny. " +
        "Spróbuj ponownie później albo zgłoś to administratorowi.",
    };
  }

  await prisma.attachment.create({
    data: {
      projectId,
      // The Blob store is private; this holds the pathname used to fetch
      // the file through our own authenticated route, not a public URL.
      fileUrl: blob.pathname,
      fileName: file.name,
    },
  });

  revalidatePath(`${PROJECTS_PATH}/${projectId}`);
  return { message: undefined };
}

export async function deleteAttachment(formData: FormData) {
  await requireCapability("manageProjects");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return;
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    select: { projectId: true, fileUrl: true },
  });
  if (!attachment) {
    return;
  }

  await prisma.attachment.delete({ where: { id } });
  // Sprzątanie pliku z Blob store — best-effort (nie blokuj, gdy brak tokenu).
  await del(attachment.fileUrl).catch(() => {});

  revalidatePath(`${PROJECTS_PATH}/${attachment.projectId}`);
}

export async function deleteProject(formData: FormData) {
  await requireCapability("manageProjects");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return;
  }

  // Pobierz ścieżki plików przed kasacją, by posprzątać je z Blob store.
  const attachments = await prisma.attachment.findMany({
    where: { projectId: id },
    select: { fileUrl: true },
  });

  // Osoby z obsady projektu — ich przydziały w INNYCH projektach mogły być
  // w konflikcie właśnie z tym projektem, więc po kasacji trzeba to przeliczyć.
  const affected = await prisma.assignment.findMany({
    where: { projectRole: { projectId: id } },
    select: { userId: true },
    distinct: ["userId"],
  });

  // Kasacja projektu usuwa kaskadowo attachments i assignments (onDelete: Cascade).
  await prisma.project.delete({ where: { id } });
  for (const { userId } of affected) await recomputeUserConflicts(prisma, userId);

  // Best-effort usunięcie osieroconych plików z Blob store.
  await Promise.allSettled(attachments.map((a) => del(a.fileUrl)));

  revalidatePath(PROJECTS_PATH);
  revalidatePath(TIMELINE_PATH);
}

export type RescheduleResult = {
  ok: boolean;
  /** Komunikat błędu — zmiana nie została zapisana. */
  message?: string;
  /** Zapisano, ale coś wymaga uwagi (np. rola poza terminami projektu). */
  warning?: string;
};

// Nowe terminy projektu z osi Gantta — z dokładnością do dnia. Wywoływane po
// jawnym zatwierdzeniu zmiany, nie w trakcie przeciągania.
export async function rescheduleProject(
  projectId: string,
  startYmd: string,
  endYmd: string
): Promise<RescheduleResult> {
  await requireCapability("manageProjects");

  const isYmd = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isYmd(startYmd) || !isYmd(endYmd)) {
    return { ok: false, message: "Nieprawidłowy format daty." };
  }

  const startDate = parseYmd(startYmd);
  const endDate = parseYmd(endYmd);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, message: "Nieprawidłowa data." };
  }
  if (startDate > endDate) {
    return {
      ok: false,
      message: "Data zakończenia nie może być wcześniejsza niż rozpoczęcia.",
    };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { startDate, endDate },
  });

  revalidatePath(TIMELINE_PATH);
  revalidatePath(PROJECTS_PATH);
  revalidatePath(`${PROJECTS_PATH}/${projectId}`);

  // Przesunięcie projektu może zostawić zapotrzebowanie na role poza jego
  // terminami. Nie blokujemy zapisu (bywa etapem przy planowaniu), ale nie
  // przechodzimy nad tym w milczeniu — z okresów ról będą kiedyś wynikać koszty.
  const roles = await prisma.projectRole.findMany({
    where: { projectId },
    // `position` to relacja, więc bez zagnieżdżonego selecta w komunikacie
    // lądował cały obiekt i użytkownik widział "[object Object]".
    select: {
      position: { select: { name: true } },
      startDate: true,
      endDate: true,
    },
  });
  const outside = roles.filter(
    (r) => r.startDate < startDate || r.endDate > endDate
  );

  if (outside.length > 0) {
    const names = [...new Set(outside.map((r) => r.position.name))].join(", ");
    return {
      ok: true,
      warning: `Zapisano, ale ${outside.length === 1 ? "rola wychodzi" : "role wychodzą"} poza terminy projektu: ${names}.`,
    };
  }

  return { ok: true };
}
