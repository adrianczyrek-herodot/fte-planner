"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/status-page";

export default function RootError({
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
    <div className="flex min-h-screen flex-col bg-muted/30">
      <StatusPage
        icon={TriangleAlert}
        title="Coś poszło nie tak"
        description={
          error.digest
            ? `Spróbuj ponownie. Jeśli błąd się powtarza, zgłoś go administratorowi i podaj kod ${error.digest}.`
            : "Spróbuj ponownie. Jeśli błąd się powtarza, zgłoś go administratorowi."
        }
      >
        <Button onClick={() => unstable_retry()}>Spróbuj ponownie</Button>
      </StatusPage>
    </div>
  );
}
