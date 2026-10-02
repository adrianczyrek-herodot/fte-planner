"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useActionForm } from "@/lib/hooks/use-action-form";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm() {
  const [state, action, pending] = useActionForm(login, undefined);
  // Ścieżka, na którą ktoś szedł przed przekierowaniem do logowania.
  const next = useSearchParams().get("next") ?? "";

  return (
    <form onSubmit={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
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
          <p className="text-sm text-destructive">{state.errors.password[0]}</p>
        )}
      </div>

      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Logowanie…" : "Zaloguj się"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/reset-password" className="text-primary underline underline-offset-4">
          Nie pamiętasz hasła?
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <Link href="/register" className="text-primary underline underline-offset-4">
          Zarejestruj się
        </Link>
      </p>
    </form>
  );
}
