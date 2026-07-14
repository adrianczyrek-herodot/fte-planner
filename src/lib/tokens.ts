import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni
const RESET_TTL_MS = 60 * 60 * 1000; // 1 godzina

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

// Tworzy jednorazowy token, zwraca surową wartość (do linku). W bazie ląduje
// tylko hash. Kasujemy wcześniejsze tokeny użytkownika, aby stary link przestał
// działać po wygenerowaniu nowego.
export async function createPasswordResetToken(
  userId: string,
  variant: "invite" | "reset"
): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const ttl = variant === "invite" ? INVITE_TTL_MS : RESET_TTL_MS;

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expires: new Date(Date.now() + ttl),
      },
    }),
  ]);

  return rawToken;
}

// Zwraca userId dla ważnego tokenu albo null. Wygasłe tokeny są sprzątane.
export async function verifyPasswordResetToken(
  rawToken: string
): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!record) return null;

  if (record.expires.getTime() < Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    return null;
  }

  return record.userId;
}

// Konsumuje token (weryfikuje + kasuje wszystkie tokeny użytkownika w jednej
// transakcji, żeby ten sam link nie zadziałał dwa razy).
export async function consumePasswordResetToken(
  rawToken: string
): Promise<string | null> {
  const userId = await verifyPasswordResetToken(rawToken);
  if (!userId) return null;

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  return userId;
}
