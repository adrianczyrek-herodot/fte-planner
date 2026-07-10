"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/app/actions/auth";
import {
  EmployeeCreateSchema,
  EmployeeFormState,
  EmployeeUpdateSchema,
} from "@/lib/validation/employee";

const EMPLOYEES_PATH = "/app/pracownicy";

export async function createEmployee(
  _state: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await requireApprovedUser();

  const validatedFields = EmployeeCreateSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    position: formData.get("position"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { email, firstName, lastName, position } = validatedFields.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { message: "Pracownik z tym adresem e-mail już istnieje." };
  }

  await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      position,
      role: "user",
      status: "approved",
    },
  });

  revalidatePath(EMPLOYEES_PATH);
  return { success: true };
}

export async function updateEmployee(
  _state: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await requireApprovedUser();

  const validatedFields = EmployeeUpdateSchema.safeParse({
    id: formData.get("id"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    position: formData.get("position"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { id, firstName, lastName, position } = validatedFields.data;

  await prisma.user.update({
    where: { id },
    data: { firstName, lastName, position },
  });

  revalidatePath(EMPLOYEES_PATH);
  return { success: true };
}

export async function setEmployeeStatus(formData: FormData) {
  const session = await requireApprovedUser();

  const id = formData.get("id");
  const status = formData.get("status");

  if (typeof id !== "string" || (status !== "approved" && status !== "inactive")) {
    throw new Error("Nieprawidłowe dane.");
  }

  if (status === "inactive") {
    if (id === session.user.id) {
      throw new Error("Nie możesz dezaktywować własnego konta.");
    }

    const approvedCount = await prisma.user.count({ where: { status: "approved" } });
    if (approvedCount <= 1) {
      throw new Error("Nie można dezaktywować ostatniego aktywnego pracownika.");
    }
  }

  await prisma.user.update({ where: { id }, data: { status } });
  revalidatePath(EMPLOYEES_PATH);
}
