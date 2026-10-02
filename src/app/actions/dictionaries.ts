"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ignoreMissing, isUniqueViolation } from "@/lib/prisma-errors";
import { pluralize } from "@/lib/plural";
import { requireCapability } from "@/lib/session";
import {
  DictionaryEntrySchema,
  type DictionaryFormState,
} from "@/lib/validation/dictionary";

const SETTINGS_PATH = "/app/ustawienia";

// Zmiana słownika przebija się na profile pracowników, role w projektach i na
// wszystkie widoki obłożenia — odświeżamy je razem z ustawieniami.
function revalidateAll() {
  revalidatePath(SETTINGS_PATH);
  revalidatePath("/app/pracownicy");
  revalidatePath("/app/projekty");
  revalidatePath("/app/zasoby");
  revalidatePath("/app/timeline");
}

type Kind = "position" | "skill";

// Duplikat to ta sama nazwa bez względu na wielkość liter: „react" obok
// „React" to dla użytkownika jedna kompetencja.
function findByName(kind: Kind, name: string) {
  const where = { name: { equals: name, mode: "insensitive" as const } };
  return kind === "position"
    ? prisma.position.findFirst({ where })
    : prisma.skill.findFirst({ where });
}

const labels: Record<Kind, { one: string; used: string }> = {
  position: {
    one: "Stanowisko",
    used: "Stanowisko jest używane — najpierw przepnij pracowników i role na inne.",
  },
  skill: { one: "Kompetencja", used: "Kompetencja jest przypisana pracownikom." },
};

export async function createDictionaryEntry(
  kind: Kind,
  _state: DictionaryFormState,
  formData: FormData
): Promise<DictionaryFormState> {
  await requireCapability("manageDictionaries");

  const v = DictionaryEntrySchema.safeParse({ name: formData.get("name") });
  if (!v.success) {
    return { errors: { name: v.error.issues.map((i) => i.message) } };
  }

  const { name } = v.data;
  const existing = await findByName(kind, name);

  if (existing) {
    return { message: `${labels[kind].one} „${existing.name}" już istnieje.` };
  }

  try {
    if (kind === "position") await prisma.position.create({ data: { name } });
    else await prisma.skill.create({ data: { name } });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { message: `${labels[kind].one} „${name}" już istnieje.` };
    }
    throw error;
  }

  revalidateAll();
  return { success: true };
}

export async function renameDictionaryEntry(
  kind: Kind,
  _state: DictionaryFormState,
  formData: FormData
): Promise<DictionaryFormState> {
  await requireCapability("manageDictionaries");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { message: "Nieprawidłowe dane." };

  const v = DictionaryEntrySchema.safeParse({ name: formData.get("name") });
  if (!v.success) {
    return { errors: { name: v.error.issues.map((i) => i.message) } };
  }

  const { name } = v.data;
  const clash = await findByName(kind, name);

  if (clash && clash.id !== id) {
    return { message: `${labels[kind].one} „${clash.name}" już istnieje.` };
  }

  // Nazwa jest referencją, więc zmiana propaguje się wszędzie sama.
  let updated;
  try {
    updated = await ignoreMissing(
      kind === "position"
        ? prisma.position.update({ where: { id }, data: { name } })
        : prisma.skill.update({ where: { id }, data: { name } })
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { message: `${labels[kind].one} „${name}" już istnieje.` };
    }
    throw error;
  }
  if (!updated) {
    revalidateAll();
    return { message: `${labels[kind].one} już nie istnieje — odśwież stronę.` };
  }

  revalidateAll();
  return { success: true };
}

export type DeleteDictionaryResult = { ok: boolean; message?: string };

export async function deleteDictionaryEntry(
  kind: Kind,
  id: string
): Promise<DeleteDictionaryResult> {
  await requireCapability("manageDictionaries");

  if (!id) return { ok: false, message: "Nieprawidłowe dane." };

  // Nie kasujemy pozycji, która jest w użyciu — inaczej rola w projekcie
  // straciłaby stanowisko (baza i tak by na to nie pozwoliła), a pracownicy
  // po cichu straciliby dane.
  if (kind === "position") {
    const [users, roles] = await Promise.all([
      prisma.user.count({ where: { positionId: id } }),
      prisma.projectRole.count({ where: { positionId: id } }),
    ]);
    if (users > 0 || roles > 0) {
      const parts = [
        users > 0 ? pluralize(users, "pracownik", "pracowników", "pracowników") : null,
        roles > 0 ? `${pluralize(roles, "rola", "role", "ról")} w projektach` : null,
      ].filter(Boolean);
      return { ok: false, message: `${labels.position.used} Używa go: ${parts.join(", ")}.` };
    }
    await ignoreMissing(prisma.position.delete({ where: { id } }));
  } else {
    const users = await prisma.user.count({ where: { skills: { some: { id } } } });
    if (users > 0) {
      return {
        ok: false,
        message: `${labels.skill.used} Ma ją ${pluralize(users, "osoba", "osoby", "osób")}.`,
      };
    }
    await ignoreMissing(prisma.skill.delete({ where: { id } }));
  }

  revalidateAll();
  return { ok: true };
}

/**
 * Szybkie dodanie stanowiska bez wychodzenia do ustawień — używane z widoku
 * projektu przy definiowaniu zapotrzebowania na role. Zwraca istniejącą
 * pozycję, jeśli nazwa się powtarza, żeby nie mnożyć duplikatów.
 */
export async function quickAddPosition(
  name: string
): Promise<{ ok: boolean; id?: string; name?: string; message?: string }> {
  // Świadomie inne uprawnienie niż reszta słowników: to robi menedżer w trakcie
  // planowania projektu, a nie administracja w ustawieniach.
  await requireCapability("manageStaffing");

  const v = DictionaryEntrySchema.safeParse({ name });
  if (!v.success) return { ok: false, message: v.error.issues[0].message };

  const existing = await findByName("position", v.data.name);
  if (existing) return { ok: true, id: existing.id, name: existing.name };

  let created;
  try {
    created = await prisma.position.create({ data: { name: v.data.name } });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const winner = await findByName("position", v.data.name);
    if (!winner) throw error;
    return { ok: true, id: winner.id, name: winner.name };
  }
  // Świadomie BEZ revalidatePath: odświeżenie trasy w trakcie tej akcji
  // unieważniało stan pickera (wybrana pozycja wracała do pustej). Nowe
  // stanowisko wystarczy dopisać po stronie klienta — pozostałe widoki
  // zobaczą je przy następnym wejściu.
  return { ok: true, id: created.id, name: created.name };
}
