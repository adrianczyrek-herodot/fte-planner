import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, LogOut, UserX } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { logout } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Oczekiwanie na zatwierdzenie — FTE Planner",
};

export default async function PendingPage() {
  const session = await auth();

  let isInactive = false;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });
    // Aktywne konto nie ma tu czego szukać (np. zatwierdzone w międzyczasie).
    if (dbUser?.status === "approved") redirect("/app");
    isInactive = dbUser?.status === "inactive";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            {isInactive ? (
              <UserX className="size-6 text-muted-foreground" />
            ) : (
              <Clock className="size-6 text-muted-foreground" />
            )}
          </div>
          <CardTitle>
            {isInactive ? "Konto dezaktywowane" : "Czekasz na zatwierdzenie"}
          </CardTitle>
          <CardDescription>
            {isInactive
              ? "Twoje konto zostało dezaktywowane przez administratora. Skontaktuj się z administratorem, aby przywrócić dostęp."
              : "Twoje konto zostało utworzone i czeka na zatwierdzenie przez administratora. Otrzymasz dostęp, gdy administrator zaakceptuje Twoją rejestrację."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Możesz zamknąć tę stronę — spróbuj zalogować się ponownie później.
          </p>
          {/* Bez tego nie dałoby się tu przelogować na inne konto: sesja
              wciąż istnieje, więc /login odsyła z powrotem na tę stronę. */}
          {session?.user && (
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut />
                Wyloguj się
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
