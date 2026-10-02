import { afterAll, beforeAll, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
} from "@/lib/tokens";

let userId = "";

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: "token-itest@example.test",
      firstName: "Token",
      lastName: "Test",
      // Tokeny dostają tylko aktywne konta: zaproszenie zakłada konto od razu
      // aktywne, a reset hasła jest wysyłany wyłącznie aktywnym.
      status: "approved",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

it("ważny token weryfikuje się i zwraca userId", async () => {
  const raw = await createPasswordResetToken(userId, "invite");
  expect(await verifyPasswordResetToken(raw)).toBe(userId);
});

it("w bazie trzymany jest HASH, nie surowy token", async () => {
  const raw = await createPasswordResetToken(userId, "reset");
  const row = await prisma.passwordResetToken.findFirst({ where: { userId } });
  expect(row?.tokenHash).toBeTruthy();
  expect(row?.tokenHash).not.toBe(raw);
});

it("token jest jednorazowy — po konsumpcji już nie działa", async () => {
  const raw = await createPasswordResetToken(userId, "reset");
  expect(await consumePasswordResetToken(raw)).toBe(userId);
  expect(await verifyPasswordResetToken(raw)).toBeNull();
});

it("wygenerowanie nowego tokenu unieważnia poprzedni", async () => {
  const first = await createPasswordResetToken(userId, "reset");
  const second = await createPasswordResetToken(userId, "reset");
  expect(await verifyPasswordResetToken(first)).toBeNull();
  expect(await verifyPasswordResetToken(second)).toBe(userId);
});

it("token wygasły jest odrzucany i sprzątany", async () => {
  const raw = await createPasswordResetToken(userId, "reset");
  // Cofamy datę ważności w przeszłość.
  await prisma.passwordResetToken.updateMany({
    where: { userId },
    data: { expires: new Date("2000-01-01T00:00:00Z") },
  });
  expect(await verifyPasswordResetToken(raw)).toBeNull();
  const remaining = await prisma.passwordResetToken.count({ where: { userId } });
  expect(remaining).toBe(0);
});

it("zmyślony / obcięty token → null", async () => {
  expect(await verifyPasswordResetToken("nie-istnieje")).toBeNull();
  expect(await verifyPasswordResetToken("")).toBeNull();
});

it("dwa równoległe użycia tego samego tokenu — przechodzi tylko jedno", async () => {
  const raw = await createPasswordResetToken(userId, "reset");
  const results = await Promise.all([
    consumePasswordResetToken(raw),
    consumePasswordResetToken(raw),
  ]);
  expect(results.filter((r) => r === userId)).toHaveLength(1);
});

it("dezaktywowane konto nie może użyć wcześniej wysłanego linku", async () => {
  const raw = await createPasswordResetToken(userId, "invite");
  await prisma.user.update({ where: { id: userId }, data: { status: "inactive" } });
  try {
    expect(await verifyPasswordResetToken(raw)).toBeNull();
    expect(await consumePasswordResetToken(raw)).toBeNull();
  } finally {
    await prisma.user.update({ where: { id: userId }, data: { status: "approved" } });
  }
});
