import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Brand } from "@/components/brand";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Rejestracja — FTE Planner",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-muted/60 to-background p-4">
      <Brand className="text-lg" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Utwórz konto</CardTitle>
          <CardDescription>
            Konto wymaga zatwierdzenia przez administratora przed pierwszym
            logowaniem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
