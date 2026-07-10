"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/app/actions/auth";
import { ProjectSchema, ProjectFormState } from "@/lib/validation/project";

const PROJECTS_PATH = "/app/projekty";

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return new Date(value);
}

export async function createProject(
  _state: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireApprovedUser();

  const validatedFields = ProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    endDate: formData.get("endDate"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { name, description } = validatedFields.data;

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      dueDate: parseOptionalDate(formData.get("dueDate")),
      endDate: parseOptionalDate(formData.get("endDate")),
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
    dueDate: formData.get("dueDate"),
    endDate: formData.get("endDate"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { name, description } = validatedFields.data;

  await prisma.project.update({
    where: { id },
    data: {
      name,
      description: description || null,
      dueDate: parseOptionalDate(formData.get("dueDate")),
      endDate: parseOptionalDate(formData.get("endDate")),
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
