import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pathname = request.nextUrl.searchParams.get("pathname");
  if (!pathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 });
  }

  // Serwujemy tylko blob-y zarejestrowane jako załącznik — inaczej można by
  // pobrać dowolny plik ze store'u, znając ścieżkę (IDOR).
  const attachment = await prisma.attachment.findFirst({
    where: { fileUrl: pathname },
    select: { id: true },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Magazyn plików może być nieskonfigurowany lub niedostępny — zwróć błąd
  // JSON-em, zamiast pozwolić wyjątkowi wyjść jako 500 bez treści.
  let result;
  try {
    result = await get(pathname, { access: "private" });
  } catch (error) {
    console.error("[attachments] blob get failed", error);
    return NextResponse.json({ error: "Storage unavailable" }, { status: 502 });
  }

  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": result.blob.contentDisposition,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
