"use client";

import Link from "next/link";

import { useActionForm } from "@/lib/hooks/use-action-form";
import { requestPasswordReset } from "@/app/actions/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionForm(requestPasswordReset, undefined);

  if (state?.success) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertDescription>
            Jeśli konto z tym adresem istnieje, wysłaliśmy link do ustawienia
            nowego hasła. Sprawdź skrzynkę.
          </AlertDescription>
        </Alert>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary underline underline-offset-4">
            Wróć do logowania
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" placeholder="jan.kowalski@firma.pl" required />
        {state?.errors?.email && (
          <p className="text-sm text-destructive">{state.errors.email[0]}</p>
        )}
      </div>

      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Wysyłanie…" : "Wyślij link"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary underline underline-offset-4">
          Wróć do logowania
        </Link>
      </p>
    </form>
  );
}
