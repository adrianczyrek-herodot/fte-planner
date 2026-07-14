import { afterAll, beforeAll, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { getMonthlyFte, recomputeConflicts } from "@/lib/assignments-core";

const MONTH = "2099-01";
let userId = "";
const projectIds: string[] = [];

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: "assign-itest@example.test",
      firstName: "Assign",
      lastName: "Test",
      status: "approved",
    },
  });
  userId = user.id;
  for (const name of ["A", "B", "C"]) {
    const p = await prisma.project.create({ data: { name: `itest-${name}` } });
    projectIds.push(p.id);
  }
});

afterAll(async () => {
  await prisma.assignment.deleteMany({ where: { userId } });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

async function assign(projectId: string, fte: number) {
  await prisma.assignment.upsert({
    where: { userId_projectId_month: { userId, projectId, month: MONTH } },
    create: { userId, projectId, month: MONTH, fte },
    update: { fte },
  });
  return recomputeConflicts(prisma, userId, MONTH);
}

it("2×0.7 w jednym miesiącu → konflikt na obu, zapis niezablokowany", async () => {
  expect(await assign(projectIds[0], 0.7)).toBe(false); // pojedyncze 0.7 OK
  const conflict = await assign(projectIds[1], 0.7); // suma 1.4
  expect(conflict).toBe(true);

  const rows = await prisma.assignment.findMany({ where: { userId, month: MONTH } });
  expect(rows).toHaveLength(2); // oba zapisane — nic nie zablokowane
  expect(rows.every((r) => r.isConflict)).toBe(true); // oba oznaczone
});

it("agregat sumuje FTE ze wszystkich przydziałów miesiąca", async () => {
  const summary = await getMonthlyFte(prisma, userId, MONTH);
  expect(summary.totalFte).toBe(1.4);
  expect(summary.count).toBe(2);
  expect(summary.isOverAllocated).toBe(true);
});

it("dokładnie 1.0 (0.3 + 0.7) → brak konfliktu", async () => {
  await prisma.assignment.deleteMany({ where: { userId } });
  await assign(projectIds[0], 0.3);
  const conflict = await assign(projectIds[1], 0.7);
  expect(conflict).toBe(false);
  const rows = await prisma.assignment.findMany({ where: { userId, month: MONTH } });
  expect(rows.every((r) => !r.isConflict)).toBe(true);
});

it("edycja: przeniesienie na inny miesiąc zdejmuje konflikt ze starej grupy", async () => {
  await prisma.assignment.deleteMany({ where: { userId } });
  await assign(projectIds[0], 0.7);
  const b = await prisma.assignment.create({
    data: { userId, projectId: projectIds[1], month: MONTH, fte: 0.7 },
  });
  await recomputeConflicts(prisma, userId, MONTH); // konflikt

  // przenosimy B na inny miesiąc i przeliczamy obie grupy (jak akcja edycji)
  await prisma.assignment.update({ where: { id: b.id }, data: { month: "2099-02" } });
  await recomputeConflicts(prisma, userId, MONTH);
  await recomputeConflicts(prisma, userId, "2099-02");

  const a = await prisma.assignment.findFirst({
    where: { userId, projectId: projectIds[0] },
  });
  const moved = await prisma.assignment.findUnique({ where: { id: b.id } });
  expect(a?.isConflict).toBe(false);
  expect(moved?.isConflict).toBe(false);
  expect(moved?.month).toBe("2099-02");
});

it("usunięcie przydziału z grupy w konflikcie przelicza resztę", async () => {
  await prisma.assignment.deleteMany({ where: { userId } });
  await assign(projectIds[0], 0.7);
  await assign(projectIds[1], 0.7); // konflikt
  const toDelete = await prisma.assignment.findFirst({
    where: { userId, projectId: projectIds[1] },
  });

  await prisma.assignment.delete({ where: { id: toDelete!.id } });
  await recomputeConflicts(prisma, userId, MONTH);

  const rows = await prisma.assignment.findMany({ where: { userId, month: MONTH } });
  expect(rows).toHaveLength(1);
  expect(rows[0].isConflict).toBe(false); // zostało 0.7 → konflikt zdjęty
});
