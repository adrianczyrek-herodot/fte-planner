import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/status-page";

// 404 wewnątrz aplikacji — renderuje się w jej układzie, więc menu zostaje.
// Trafiają tu np. linki do usuniętego projektu albo pracownika.
export default function AppNotFound() {
  return (
    <StatusPage
      icon={SearchX}
      title="Nie znaleziono"
      description="Ten projekt lub pracownik nie istnieje — mógł zostać usunięty. Wybierz pozycję z menu albo wróć do panelu."
    >
      <Button asChild>
        <Link href="/app">Wróć do panelu</Link>
      </Button>
    </StatusPage>
  );
}
