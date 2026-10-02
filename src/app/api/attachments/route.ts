import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, type Role } from "@/lib/permissions";

// Tylko te typy wolno otworzyć w karcie przeglądarki. Każdy inny plik (np. HTML
// albo SVG, które mogą zawierać skrypt) idzie jako pobranie — inaczej wgrany
// plik wykonałby się w domenie aplikacji, w sesji osoby, która go otworzyła.
const INLINE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

function contentDisposition(type: "inline" | "attachment", fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  }

  // Status i rolę czytamy z bazy, nie z tokenu — tak jak strony aplikacji —
  // żeby dezaktywacja albo zmiana roli działały od razu.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, role: true },
  });
  if (!dbUser || dbUser.status !== "approved" || !can(dbUser.role as Role, "viewProjects")) {
    return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  }

  const pathname = request.nextUrl.searchParams.get("pathname");
  if (!pathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 });
  }

  // Serwujemy tylko blob-y zarejestrowane jako załącznik — inaczej można by
  // pobrać dowolny plik ze store'u, znając ścieżkę (IDOR).
  const attachment = await prisma.attachment.findFirst({
    where: { fileUrl: pathname },
    select: { id: true, fileName: true },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Nie znaleziono pliku." }, { status: 404 });
  }

  // Magazyn plików może być nieskonfigurowany lub niedostępny — zwróć błąd
  // JSON-em, zamiast pozwolić wyjątkowi wyjść jako 500 bez treści.
  let result;
  try {
    result = await get(pathname, { access: "private" });
  } catch (error) {
    console.error("[attachments] blob get failed", error);
    return NextResponse.json(
      { error: "Magazyn plików jest chwilowo niedostępny." },
      { status: 502 }
    );
  }

  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Nie znaleziono pliku." }, { status: 404 });
  }

  const contentType = result.blob.contentType;
  const inline = INLINE_TYPES.has(contentType.split(";")[0].trim().toLowerCase());

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": inline ? contentType : "application/octet-stream",
      "Content-Disposition": contentDisposition(
        inline ? "inline" : "attachment",
        attachment.fileName
      ),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
