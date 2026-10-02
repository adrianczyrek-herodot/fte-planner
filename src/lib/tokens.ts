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
// Link działa tylko dla aktywnego konta — inaczej dezaktywowany pracownik
// mógłby starym zaproszeniem albo resetem wrócić do aplikacji.
export async function verifyPasswordResetToken(
  rawToken: string
): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { id: true, userId: true, expires: true, user: { select: { status: true } } },
  });

  if (!record) return null;

  if (record.expires.getTime() < Date.now()) {
    await prisma.passwordResetToken.deleteMany({ where: { id: record.id } });
    return null;
  }

  if (record.user.status !== "approved") return null;

  return record.userId;
}

// Konsumuje token: weryfikuje go i kasuje wszystkie tokeny użytkownika, żeby
// ten sam link nie zadziałał dwa razy. Skasowanie samego tokenu jest warunkiem
// sukcesu — z dwóch równoległych wysłań formularza wygrywa tylko jedno.
export async function consumePasswordResetToken(
  rawToken: string
): Promise<string | null> {
  const userId = await verifyPasswordResetToken(rawToken);
  if (!userId) return null;

  const { count } = await prisma.passwordResetToken.deleteMany({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (count === 0) return null;

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  return userId;
}
