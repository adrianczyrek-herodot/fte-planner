import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verifyPasswordResetToken } from "@/lib/tokens";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = {
  title: "Ustaw hasło — FTE Planner",
};

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const userId = token ? await verifyPasswordResetToken(token) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Ustaw hasło</CardTitle>
          <CardDescription>
            {userId
              ? "Wybierz hasło, którym będziesz się logować do FTE Planner."
              : "Link jest nieprawidłowy lub wygasł."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userId && token ? (
            <SetPasswordForm token={token} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Poproś administratora o nowe zaproszenie lub{" "}
              <Link
                href="/reset-password"
                className="text-primary underline underline-offset-4"
              >
                zresetuj hasło ponownie
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
