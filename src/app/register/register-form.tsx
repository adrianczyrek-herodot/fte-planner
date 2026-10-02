"use client";

import Link from "next/link";

import { useActionForm } from "@/lib/hooks/use-action-form";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RegisterForm() {
  const [state, action, pending] = useActionForm(signup, undefined);

  return (
    <form onSubmit={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">Imię</Label>
          <Input id="firstName" name="firstName" placeholder="Jan" required />
          {state?.errors?.firstName && (
            <p className="text-sm text-destructive">{state.errors.firstName[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Nazwisko</Label>
          <Input id="lastName" name="lastName" placeholder="Kowalski" required />
          {state?.errors?.lastName && (
            <p className="text-sm text-destructive">{state.errors.lastName[0]}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" placeholder="jan.kowalski@firma.pl" required />
        {state?.errors?.email && (
          <p className="text-sm text-destructive">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Hasło</Label>
        <Input id="password" name="password" type="password" required />
        {state?.errors?.password && (
          <ul className="text-sm text-destructive">
            {state.errors.password.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>

      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Tworzenie konta…" : "Zarejestruj się"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{" "}
        <Link href="/login" className="text-primary underline underline-offset-4">
          Zaloguj się
        </Link>
      </p>
    </form>
  );
}
