import type { PrismaClient } from "@/generated/prisma/client";
import { computeAssignmentConflicts } from "@/lib/staffing";

// Przelicza flagę konfliktu dla WSZYSTKICH przydziałów danego pracownika
// (po wszystkich rolach/projektach), bo przeciążenie liczy się per user+dzień.
export async function recomputeUserConflicts(
  db: PrismaClient,
  userId: string
): Promise<void> {
  const rows = await db.assignment.findMany({
    where: { userId },
    select: { id: true, startDate: true, endDate: true, fte: true },
  });

  const flags = computeAssignmentConflicts(
    rows.map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      fte: Number(r.fte),
    }))
  );

  await db.$transaction(
    rows.map((r) =>
      db.assignment.update({
        where: { id: r.id },
        data: { isConflict: flags.get(r.id) ?? false },
      })
    )
  );
}
