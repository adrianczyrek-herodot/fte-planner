import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/status-page";

export const metadata: Metadata = {
  title: "Nie znaleziono strony — FTE Planner",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <StatusPage
        icon={SearchX}
        title="Nie znaleziono strony"
        description="Ten adres nie istnieje albo strona została przeniesiona. Sprawdź link lub wróć do panelu."
      >
        <Button asChild>
          <Link href="/app">Wróć do panelu</Link>
        </Button>
      </StatusPage>
    </div>
  );
}
