"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/app/actions/auth";
import {
  CostItemSchema,
  RateSchema,
  type CostItemFormState,
  type RateFormState,
} from "@/lib/validation/rate";

// Zmiana stawki przelicza koszty wszystkich projektów, w których dana osoba
// albo stanowisko występuje — odświeżamy więc ustawienia i listę projektów.
function revalidateCosts() {
  revalidatePath("/app/ustawienia");
  revalidatePath("/app/projekty");
}

type RateKind = "employee" | "position";

/**
 * Nowa stawka nie nadpisuje poprzedniej — dokłada wpis z datą obowiązywania.
 * Ta sama data dla tego samego właściciela jest jednak korektą, nie historią,
 * więc ją nadpisujemy (baza i tak ma na to unikalny indeks).
 */
export async function addRate(
  kind: RateKind,
  ownerId: string,
  _state: RateFormState,
  formData: FormData
): Promise<RateFormState> {
  await requireCapability("manageRates");

  const v = RateSchema.safeParse({
    hourlyRate: formData.get("hourlyRate"),
    validFrom: formData.get("validFrom"),
  });
  if (!v.success) {
    const f = v.error.flatten().fieldErrors;
    return { errors: { hourlyRate: f.hourlyRate, validFrom: f.validFrom } };
  }

  const { hourlyRate, validFrom } = v.data;

  if (kind === "employee") {
    await prisma.employeeRate.upsert({
      where: { userId_validFrom: { userId: ownerId, validFrom } },
      create: { userId: ownerId, hourlyRate, validFrom },
      update: { hourlyRate },
    });
  } else {
    await prisma.positionRate.upsert({
      where: { positionId_validFrom: { positionId: ownerId, validFrom } },
      create: { positionId: ownerId, hourlyRate, validFrom },
      update: { hourlyRate },
    });
  }

  revalidateCosts();
  return { success: true };
}

export async function deleteRate(kind: RateKind, id: string) {
  await requireCapability("manageRates");
  if (!id) return;

  if (kind === "employee") await prisma.employeeRate.delete({ where: { id } });
  else await prisma.positionRate.delete({ where: { id } });

  revalidateCosts();
}

// --- Koszty dodatkowe projektu ---------------------------------------------

export async function addCostItem(
  projectId: string,
  _state: CostItemFormState,
  formData: FormData
): Promise<CostItemFormState> {
  await requireCapability("manageRates");

  const v = CostItemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") ?? undefined,
    amount: formData.get("amount"),
  });
  if (!v.success) {
    const f = v.error.flatten().fieldErrors;
    return { errors: { name: f.name, amount: f.amount, category: f.category } };
  }

  await prisma.projectCostItem.create({
    data: {
      projectId,
      name: v.data.name,
      category: v.data.category,
      amount: v.data.amount,
    },
  });

  revalidatePath(`/app/projekty/${projectId}`);
  revalidatePath("/app/projekty");
  return { success: true };
}

export async function deleteCostItem(formData: FormData) {
  await requireCapability("manageRates");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const item = await prisma.projectCostItem.delete({
    where: { id },
    select: { projectId: true },
  });

  revalidatePath(`/app/projekty/${item.projectId}`);
  revalidatePath("/app/projekty");
}
