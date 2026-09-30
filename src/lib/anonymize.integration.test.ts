import { afterEach, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { anonymizedIdentity } from "@/lib/anonymize";

// Test sprawdza to, czego czysta logika sprawdzić nie może: że po anonimizacji
// w bazie faktycznie nie ma już danych osobowych, a historia obsady projektów
// przeżywa operację. To jest cały sens wyboru anonimizacji zamiast usunięcia.

const PREFIX = "anon-itest";

afterEach(async () => {
  const users = await prisma.user.findMany({
    where: { OR: [{ email: { contains: PREFIX } }, { lastName: { contains: PREFIX } }] },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);

  await prisma.assignment.deleteMany({ where: { userId: { in: ids } } });
  await prisma.projectRole.deleteMany({ where: { project: { name: { contains: PREFIX } } } });
  await prisma.project.deleteMany({ where: { name: { contains: PREFIX } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.position.deleteMany({ where: { name: { contains: PREFIX } } });
  await prisma.$disconnect();
});

it("anonimizacja usuwa dane osobowe, ale zostawia przydziały", async () => {
  const position = await prisma.position.create({
    data: { name: `${PREFIX}-stanowisko` },
  });

  const user = await prisma.user.create({
    data: {
      email: `${PREFIX}-jan@example.test`,
      firstName: "Jan",
      lastName: "Kowalski",
      passwordHash: "hash-do-usuniecia",
      status: "approved",
      positionId: position.id,
    },
  });

  const project = await prisma.project.create({ data: { name: `${PREFIX}-projekt` } });
  const role = await prisma.projectRole.create({
    data: {
      projectId: project.id,
      positionId: position.id,
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2026, 2, 31)),
      requiredFte: 1,
    },
  });
  await prisma.assignment.create({
    data: {
      userId: user.id,
      projectRoleId: role.id,
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2026, 2, 31)),
      fte: 1,
    },
  });
  await prisma.session.create({
    data: {
      sessionToken: `${PREFIX}-token`,
      userId: user.id,
      expires: new Date(Date.now() + 86_400_000),
    },
  });

  // --- operacja, dokładnie tak jak robi to akcja serwerowa ---
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.account.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { ...anonymizedIdentity(user.id), skills: { set: [] } },
    }),
  ]);

  const po = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  // Dane osobowe zniknęły.
  expect(po.firstName).toBe("Pracownik");
  expect(po.lastName).not.toContain("Kowalski");
  expect(po.email).not.toContain("jan");
  expect(po.passwordHash).toBeNull();
  expect(po.positionId).toBeNull();
  expect(po.status).toBe("inactive");
  expect(po.anonymizedAt).not.toBeNull();

  // Dostęp odebrany natychmiast.
  expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);

  // Historia obsady przeżyła — to jest powód, dla którego nie kasujemy rekordu.
  const przydzialy = await prisma.assignment.findMany({ where: { userId: user.id } });
  expect(przydzialy).toHaveLength(1);
  expect(Number(przydzialy[0].fte)).toBe(1);
  expect(przydzialy[0].startDate.toISOString().slice(0, 10)).toBe("2026-01-01");
});

it("e-mail zanonimizowanego nie koliduje z drugim zanonimizowanym", async () => {
  const a = await prisma.user.create({
    data: { email: `${PREFIX}-a@example.test`, firstName: "A", lastName: `${PREFIX}-a` },
  });
  const b = await prisma.user.create({
    data: { email: `${PREFIX}-b@example.test`, firstName: "B", lastName: `${PREFIX}-b` },
  });

  await prisma.user.update({ where: { id: a.id }, data: anonymizedIdentity(a.id) });

  // Kolumna email ma więzy UNIQUE — gdyby adres nie zależał od id, ta operacja
  // wywaliłaby się na drugiej osobie.
  await expect(
    prisma.user.update({ where: { id: b.id }, data: anonymizedIdentity(b.id) })
  ).resolves.toBeDefined();
});
