"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { emailLookup } from "@/lib/validation/email";
import { anonymizedIdentity } from "@/lib/anonymize";
import { auditEntry, roleChangeDetails, statusChangeAction } from "@/lib/audit";
import { requireCapability } from "@/app/actions/auth";
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
  await requireCapability("manageEmployees");

  const validatedFields = EmployeeCreateSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    positionId: formData.get("positionId"),
    skillIds: formData.getAll("skillIds"),
    role: formData.get("role"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { email, firstName, lastName, positionId, skillIds, role } =
    validatedFields.data;

  const existingUser = await prisma.user.findFirst({ where: emailLookup(email) });
  if (existingUser) {
    return { message: "Pracownik z tym adresem e-mail już istnieje." };
  }

  const employee = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      positionId,
      skills: { connect: skillIds.map((id) => ({ id })) },
      role,
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
  const { session } = await requireCapability("manageEmployees");

  const validatedFields = EmployeeUpdateSchema.safeParse({
    id: formData.get("id"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    positionId: formData.get("positionId"),
    skillIds: formData.getAll("skillIds"),
    role: formData.get("role"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { id, firstName, lastName, positionId, skillIds, role } =
    validatedFields.data;

  // Edycja zanonimizowanego rekordu wpisałaby mu z powrotem imię i nazwisko,
  // odwracając nieodwracalną z założenia operację. UI takiego formularza nie
  // pokazuje; to backstop na bezpośrednie wywołanie akcji.
  const przed = await prisma.user.findUnique({
    where: { id },
    select: { anonymizedAt: true, role: true },
  });
  if (!przed || przed.anonymizedAt !== null) {
    return { success: true };
  }

  // Własnej roli zmienić nie można (ochrona przed samo-odebraniem admina), więc
  // zdarzenie powstaje tylko wtedy, gdy rola faktycznie się zmienia.
  const rolaZmieniona = id !== session.user.id && przed.role !== role;

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        positionId,
        // `set` zastępuje cały zestaw kompetencji tym z formularza.
        skills: { set: skillIds.map((id) => ({ id })) },
        ...(id === session.user.id ? {} : { role }),
      },
    }),
    // Zmiana imienia czy kompetencji nie trafia do dziennika — logujemy to, co
    // zmienia czyjeś uprawnienia, a nie każdą edycję formularza.
    ...(rolaZmieniona
      ? [
          prisma.auditEvent.create({
            data: auditEntry({
              actorId: session.user.id,
              action: "employee_role_changed",
              targetUserId: id,
              details: roleChangeDetails(przed.role, role),
            }),
          }),
        ]
      : []),
  ]);

  revalidatePath(EMPLOYEES_PATH);
  return { success: true };
}

export async function setEmployeeStatus(formData: FormData) {
  const { session } = await requireCapability("manageEmployees");

  const id = formData.get("id");
  const status = formData.get("status");

  // Te warunki są niezmiennikami wymuszanymi też w UI (wyłączone przyciski).
  // Tu pełnią rolę backstopu na bezpośrednie wywołanie akcji albo wyścig —
  // zamiast rzucać wyjątkiem (crash overlay), po cichu nie robimy nic.
  if (typeof id !== "string" || (status !== "approved" && status !== "inactive")) {
    return;
  }

  // Zanonimizowany rekord zostaje nieaktywny na zawsze — przywrócenie go do
  // statusu „aktywny” wpuściłoby pustą tożsamość z powrotem na listy obsady.
  const biezacy = await prisma.user.findUnique({
    where: { id },
    select: { anonymizedAt: true, status: true },
  });
  if (!biezacy || biezacy.anonymizedAt !== null) {
    return;
  }

  // Ustawienie tego samego statusu nie jest zdarzeniem — nie zaśmiecamy nim
  // dziennika.
  if (biezacy.status === status) {
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

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { status } }),
    // Dezaktywacja unieważnia wysłane zaproszenia i linki resetu hasła.
    ...(status === "inactive"
      ? [prisma.passwordResetToken.deleteMany({ where: { userId: id } })]
      : []),
    prisma.auditEvent.create({
      data: auditEntry({
        actorId: session.user.id,
        action: statusChangeAction(status),
        targetUserId: id,
      }),
    }),
  ]);

  revalidatePath(EMPLOYEES_PATH);
}

/**
 * Anonimizacja pracownika — realizacja prawa do bycia zapomnianym (RODO art.
 * 17). Operacja jest NIEODWRACALNA: dane osobowe są nadpisywane, nie ukrywane.
 *
 * Rekord użytkownika zostaje, bo wiszą na nim kaskadą przydziały i koszty
 * projektów — skasowanie osoby zabrałoby historię obsady. Po nadpisaniu nie da
 * się już powiązać rekordu z człowiekiem, więc przestaje on być daną osobową.
 *
 * Wszystko idzie w jednej transakcji: gdyby nadpisanie tożsamości przeszło, a
 * kasowanie sesji nie, osoba zostałaby zalogowana na zanonimizowanym koncie.
 */
export async function anonymizeEmployee(formData: FormData) {
  const { session } = await requireCapability("manageEmployees");

  const id = formData.get("id");
  if (typeof id !== "string") {
    return;
  }

  // Te same niezmienniki co przy dezaktywacji, wymuszane również w UI. Tu
  // działają jako backstop na bezpośrednie wywołanie akcji albo wyścig —
  // zamiast rzucać wyjątkiem, po cichu nie robimy nic.
  if (id === session.user.id) {
    return;
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { status: true, anonymizedAt: true },
  });

  // Brak rekordu albo już zanonimizowany — druga anonimizacja nadpisałaby
  // znacznik czasu, gubiąc informację, kiedy dane faktycznie zniknęły.
  if (!target || target.anonymizedAt !== null) {
    return;
  }

  if (target.status === "approved") {
    const approvedCount = await prisma.user.count({ where: { status: "approved" } });
    if (approvedCount <= 1) {
      return;
    }
  }

  await prisma.$transaction([
    // Dostęp odbieramy natychmiast: sesje, konta zewnętrzne i niewykorzystane
    // tokeny resetu hasła znikają razem z tożsamością.
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.account.deleteMany({ where: { userId: id } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
    prisma.user.update({
      where: { id },
      data: {
        ...anonymizedIdentity(id),
        // Kompetencje same w sobie nie identyfikują, ale w małym zespole
        // rzadki zestaw umiejętności wskazuje konkretną osobę.
        skills: { set: [] },
      },
    }),
    // Wpis do dziennika idzie tą samą transakcją: operacja nieodwracalna bez
    // śladu, kto ją wykonał, nie spełnia wymogu rozliczalności.
    prisma.auditEvent.create({
      data: auditEntry({
        actorId: session.user.id,
        action: "employee_anonymized",
        targetUserId: id,
      }),
    }),
  ]);

  revalidatePath(EMPLOYEES_PATH);
  revalidatePath("/app/zasoby");
}
