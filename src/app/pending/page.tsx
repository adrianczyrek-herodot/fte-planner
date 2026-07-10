import type { Metadata } from "next";
import { Clock } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Oczekiwanie na zatwierdzenie — FTE Planner",
};

export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <Clock className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>Czekasz na zatwierdzenie</CardTitle>
          <CardDescription>
            Twoje konto zostało utworzone i czeka na zatwierdzenie przez
            administratora. Otrzymasz dostęp, gdy administrator zaakceptuje
            Twoją rejestrację.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Możesz zamknąć tę stronę — spróbuj zalogować się ponownie później.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
