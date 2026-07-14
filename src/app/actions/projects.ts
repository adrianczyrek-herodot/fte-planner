"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/app/actions/auth";
import { ProjectSchema, ProjectFormState } from "@/lib/validation/project";

const PROJECTS_PATH = "/app/projekty";

export async function createProject(
  _state: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireApprovedUser();

  const validatedFields = ProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { name, description, startDate, endDate } = validatedFields.data;

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      startDate,
      endDate,
    },
  });

  revalidatePath(PROJECTS_PATH);
  redirect(`/app/projekty/${project.id}`);
}

export async function updateProject(
  _state: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireApprovedUser();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { message: "Nieprawidłowe dane." };
  }

  const validatedFields = ProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { name, description, startDate, endDate } = validatedFields.data;

  await prisma.project.update({
    where: { id },
    data: {
      name,
      description: description || null,
      startDate,
      endDate,
    },
  });

  revalidatePath(PROJECTS_PATH);
  revalidatePath(`${PROJECTS_PATH}/${id}`);
  return { success: true };
}

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25 MB

export type AttachmentUploadState = { message?: string } | undefined;

export async function uploadAttachment(
  projectId: string,
  _state: AttachmentUploadState,
  formData: FormData
): Promise<AttachmentUploadState> {
  await requireApprovedUser();

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { message: "Wybierz plik do przesłania." };
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return { message: "Plik jest zbyt duży (maksymalnie 25 MB)." };
  }

  const blob = await put(`projects/${projectId}/${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

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
  await requireApprovedUser();

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
  await requireApprovedUser();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return;
  }

  // Pobierz ścieżki plików przed kasacją, by posprzątać je z Blob store.
  const attachments = await prisma.attachment.findMany({
    where: { projectId: id },
    select: { fileUrl: true },
  });

  // Kasacja projektu usuwa kaskadowo attachments i assignments (onDelete: Cascade).
  await prisma.project.delete({ where: { id } });

  // Best-effort usunięcie osieroconych plików z Blob store.
  await Promise.allSettled(attachments.map((a) => del(a.fileUrl)));

  revalidatePath(PROJECTS_PATH);
}
