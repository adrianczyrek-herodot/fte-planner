"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/status-page";

// Błąd wewnątrz aplikacji — zastępuje tylko treść strony, menu zostaje.
// Na produkcji Next.js nie przekazuje treści błędu do przeglądarki, jedynie
// identyfikator (digest), po którym można go znaleźć w logach serwera.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      icon={TriangleAlert}
      title="Coś poszło nie tak"
      description={
        <>
          Nie udało się wczytać tej strony albo zapisać zmian. Spróbuj ponownie — jeśli
          błąd się powtarza, zgłoś go administratorowi
          {error.digest ? (
            <>
              {" "}
              i podaj kod <code className="rounded bg-muted px-1">{error.digest}</code>
            </>
          ) : null}
          .
        </>
      }
    >
      <Button onClick={() => unstable_retry()}>Spróbuj ponownie</Button>
      <Button variant="outline" asChild>
        <Link href="/app">Wróć do panelu</Link>
      </Button>
    </StatusPage>
  );
}
