import { afterEach, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

const EMAIL = "emp-itest@example.test";

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: "emp-itest" } } });
  await prisma.$disconnect();
});

it("e-mail jest unikalny — druga próba z tym samym adresem rzuca błędem", async () => {
  await prisma.user.create({
    data: { email: EMAIL, firstName: "A", lastName: "B", status: "approved" },
  });

  await expect(
    prisma.user.create({
      data: { email: EMAIL, firstName: "C", lastName: "D", status: "approved" },
    })
  ).rejects.toThrow();
});

it("licznik aktywnych (guard 'ostatni aktywny') liczy tylko status approved", async () => {
  await prisma.user.createMany({
    data: [
      { email: "emp-itest-1@x.test", firstName: "A", lastName: "1", status: "approved" },
      { email: "emp-itest-2@x.test", firstName: "B", lastName: "2", status: "inactive" },
      { email: "emp-itest-3@x.test", firstName: "C", lastName: "3", status: "pending" },
    ],
  });

  const approved = await prisma.user.count({
    where: { status: "approved", email: { contains: "emp-itest" } },
  });
  expect(approved).toBe(1); // inactive i pending nie liczą się jako aktywni
});
