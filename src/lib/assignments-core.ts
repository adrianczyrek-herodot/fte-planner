import type { PrismaClient } from "@/generated/prisma/client";
import { isOverAllocated, sumFte } from "@/lib/fte";

// Rdzeń logiki przydziałów wydzielony z akcji serwerowej, żeby dało się go
// testować bezpośrednio (z prawdziwym klientem Prisma) bez kontekstu Next.
// Przyjmuje klienta bazy jako argument — działa zarówno z singletonem apki,
// jak i z instancją tworzoną w teście.
type AssignmentDb = Pick<PrismaClient, "assignment">;

// Przelicza konflikt dla całej grupy (pracownik + miesiąc) i zapisuje ten sam
// flag na wszystkich przydziałach grupy. Zwraca, czy grupa jest w konflikcie.
export async function recomputeConflicts(
  db: AssignmentDb,
  userId: string,
  month: string
): Promise<boolean> {
  const rows = await db.assignment.findMany({
    where: { userId, month },
    select: { fte: true },
  });

  const conflict = isOverAllocated(sumFte(rows.map((r) => Number(r.fte))));

  await db.assignment.updateMany({
    where: { userId, month },
    data: { isConflict: conflict },
  });

  return conflict;
}

// Agregat sumy FTE pracownika w danym miesiącu ze WSZYSTKICH jego przydziałów.
export async function getMonthlyFte(
  db: AssignmentDb,
  userId: string,
  month: string
) {
  const rows = await db.assignment.findMany({
    where: { userId, month },
    select: { fte: true },
  });

  const totalFte = sumFte(rows.map((r) => Number(r.fte)));

  return {
    userId,
    month,
    totalFte,
    isOverAllocated: isOverAllocated(totalFte),
    count: rows.length,
  };
}
