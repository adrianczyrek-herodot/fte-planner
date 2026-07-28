import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Logowanie — FTE Planner",
};

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel marki — stonowany akcent + hasło (tylko na szerokich ekranach). */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary/75 p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-black/10 blur-3xl"
        />

        <span className="relative flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-white/15">
            <CalendarRange className="size-4" />
          </span>
          FTE Planner
        </span>

        <div className="relative space-y-3">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Planowanie FTE bez chaosu.
          </h2>
          <p className="max-w-sm text-primary-foreground/80">
            Projekty, przydziały i konflikty obłożenia — w jednym, przejrzystym
            widoku.
          </p>
        </div>

        <span className="relative text-sm text-primary-foreground/60">
          © FTE Planner
        </span>
      </div>

      {/* Formularz. */}
      <div className="flex items-center justify-center bg-muted/30 p-6">
        <div className="flex w-full max-w-md flex-col gap-6">
          <Brand className="text-lg lg:hidden" />
          <Card>
            <CardHeader>
              <CardTitle>Zaloguj się</CardTitle>
              <CardDescription>
                Panel planowania FTE dla zespołu zarządzającego.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
