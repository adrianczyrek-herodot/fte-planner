"use client";

import "./globals.css";

// Ostatnia linia obrony: błąd w samym głównym układzie. Zastępuje cały
// dokument, więc musi mieć własne <html> i <body> i nie może polegać na
// komponentach, które mogły właśnie zawieść.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="pl">
      <body className="flex min-h-screen items-center justify-center bg-muted/30 p-6 font-sans">
        <title>Błąd — FTE Planner</title>
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <h1 className="text-xl font-semibold">Aplikacja napotkała błąd</h1>
          <p className="text-sm text-muted-foreground">
            Spróbuj ponownie za chwilę.
            {error.digest ? ` Kod błędu dla administratora: ${error.digest}.` : ""}
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Spróbuj ponownie
          </button>
        </div>
      </body>
    </html>
  );
}
