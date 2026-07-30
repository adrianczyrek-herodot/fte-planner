"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/actions/auth";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendPasswordSetupEmail } from "@/lib/mail";
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
  await requireAdmin();

  const validatedFields = EmployeeCreateSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    position: formData.get("position"),
    skills: formData.getAll("skills"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { email, firstName, lastName, position, skills } = validatedFields.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { message: "Pracownik z tym adresem e-mail już istnieje." };
  }

  const employee = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      position,
      skills,
      role: "user",
      // Bez hasła konto nie pozwala się zalogować; pracownik ustawi je przez
      // link z zaproszenia. Status "approved" sprawia, że od razu widnieje na
      // liście pracowników.
      status: "approved",
    },
  });

  // Zaproszenie: token + „mail" z linkiem do ustawienia hasła (tryb dev loguje
  // link do konsoli serwera).
  const token = await createPasswordResetToken(employee.id, "invite");
  await sendPasswordSetupEmail(employee.email, token, "invite");

  revalidatePath(EMPLOYEES_PATH);
  return { success: true };
}

export async function updateEmployee(
  _state: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await requireAdmin();

  const validatedFields = EmployeeUpdateSchema.safeParse({
    id: formData.get("id"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    position: formData.get("position"),
    skills: formData.getAll("skills"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { id, firstName, lastName, position, skills } = validatedFields.data;

  await prisma.user.update({
    where: { id },
    data: { firstName, lastName, position, skills },
  });

  revalidatePath(EMPLOYEES_PATH);
  return { success: true };
}

export async function setEmployeeStatus(formData: FormData) {
  const session = await requireAdmin();

  const id = formData.get("id");
  const status = formData.get("status");

  // Te warunki są niezmiennikami wymuszanymi też w UI (wyłączone przyciski).
  // Tu pełnią rolę backstopu na bezpośrednie wywołanie akcji albo wyścig —
  // zamiast rzucać wyjątkiem (crash overlay), po cichu nie robimy nic.
  if (typeof id !== "string" || (status !== "approved" && status !== "inactive")) {
    return;
  }

  if (status === "inactive") {
    // Nie pozwól dezaktywować własnego konta ani ostatniego aktywnego pracownika.
    if (id === session.user.id) {
      return;
    }

    const approvedCount = await prisma.user.count({ where: { status: "approved" } });
    if (approvedCount <= 1) {
      return;
    }
  }

  await prisma.user.update({ where: { id }, data: { status } });
  revalidatePath(EMPLOYEES_PATH);
}
