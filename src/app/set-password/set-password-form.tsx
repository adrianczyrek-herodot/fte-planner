"use client";

import { useActionState } from "react";
import Link from "next/link";

import { setPassword } from "@/app/actions/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setPassword, undefined);

  if (state?.success) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertDescription>
            Hasło zostało ustawione. Możesz się teraz zalogować.
          </AlertDescription>
        </Alert>
        <Button asChild className="mt-2">
          <Link href="/login">Przejdź do logowania</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nowe hasło</Label>
        <Input id="password" name="password" type="password" required />
        {state?.errors?.password && (
          <ul className="text-sm text-destructive">
            {state.errors.password.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Powtórz hasło</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
        {state?.errors?.confirmPassword && (
          <p className="text-sm text-destructive">{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Zapisywanie…" : "Ustaw hasło"}
      </Button>
    </form>
  );
}
