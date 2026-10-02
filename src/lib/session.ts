import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, capabilitiesOf, type Capability, type Role } from "@/lib/permissions";

// Bramy dostępu dla stron i akcji. Celowo poza plikiem "use server": wszystko,
// co eksportuje taki plik, staje się publicznym endpointem, a te funkcje nie są
// akcjami — tylko sprawdzają, kto pyta.

/**
 * Zalogowana osoba odczytana z BAZY, raz na żądanie. Sesja JWT pamięta stan z
 * chwili logowania, więc status, rolę i imię bierzemy z bazy — dezaktywacja,
 * zmiana roli czy imienia działają od razu. `cache` sprawia, że layout i strona
 * w jednym żądaniu dzielą jedno zapytanie zamiast robić cztery po kolei.
 */
const currentDbUser = cache(async (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, role: true, firstName: true, lastName: true, email: true },
  })
);

export async function requireApprovedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await currentDbUser(session.user.id);
  if (!dbUser || dbUser.status !== "approved") {
    redirect(dbUser?.status === "inactive" ? "/pending" : "/login");
  }

  return {
    ...session,
    user: {
      ...session.user,
      name: `${dbUser.firstName} ${dbUser.lastName}`,
      email: dbUser.email,
      role: dbUser.role,
    },
  };
}

/**
 * Jedyna brama do stron i akcji: sprawdzamy UPRAWNIENIE z macierzy, nie nazwę
 * roli. Rolę czytamy świeżo z bazy (nie z tokenu JWT), żeby jej zmiana działała
 * natychmiast — tak samo jak przy statusie w requireApprovedUser.
 */
export async function requireCapability(capability: Capability) {
  const session = await requireApprovedUser();
  const role = session.user.role as Role;

  if (!can(role, capability)) {
    redirect("/app");
  }

  return { session, role };
}

// Rola pobrana świeżo z bazy — do rozgałęzień UI (np. dashboard admin vs user).
export async function getCurrentRole() {
  const session = await requireApprovedUser();
  const role = session.user.role as Role;
  return { session, role, capabilities: capabilitiesOf(role) };
}
