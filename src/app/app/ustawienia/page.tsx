import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/session";
import { DictionaryManager } from "./_components/dictionary-manager";
import { RateManager } from "./_components/rate-manager";
import { pluralize } from "@/lib/plural";

export const metadata: Metadata = {
  title: "Ustawienia — FTE Planner",
};

export default async function SettingsPage() {
  await requireCapability("manageDictionaries");

  // Liczniki użycia pozwalają w interfejsie od razu pokazać, czego nie da się
  // usunąć — zamiast dowiedzieć się tego dopiero po kliknięciu.
  const [positions, skills, employees] = await Promise.all([
    prisma.position.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { users: true, projectRoles: true } },
      },
    }),
    prisma.skill.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { users: true } } },
    }),
    prisma.user.findMany({
      // Oczekujący nie mają jeszcze przydziałów, więc stawka nie ma czego
      // wycenić (a lista nie powinna pokazywać obcych rejestracji). Nieaktywni
      // zostają: ich stawki dalej wyceniają historyczne przydziały i trzeba móc
      // je poprawić.
      where: { status: { in: ["approved", "inactive"] }, anonymizedAt: null },
      orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        position: { select: { name: true } },
        rates: {
          orderBy: { validFrom: "desc" },
          select: { id: true, hourlyRate: true, validFrom: true },
        },
      },
    }),
  ]);

  const positionRates = await prisma.position.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      rates: {
        orderBy: { validFrom: "desc" },
        select: { id: true, hourlyRate: true, validFrom: true },
      },
    },
  });

  // Decimal i Date nie przechodzą przez granicę do komponentu klienckiego.
  const serializeRates = (rates: { id: string; hourlyRate: unknown; validFrom: Date }[]) =>
    rates.map((r) => ({
      id: r.id,
      hourlyRate: String(r.hourlyRate),
      validFrom: r.validFrom.toISOString().slice(0, 10),
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ustawienia</h1>
        <p className="text-muted-foreground">
          Słowniki używane w profilach pracowników i w zapotrzebowaniu na role.
          Zmiana nazwy propaguje się wszędzie, gdzie pozycja jest użyta.
        </p>
      </div>

      <DictionaryManager
        kind="position"
        title="Stanowiska"
        description="Jedna lista dla profili pracowników i dla roli w projektach."
        addLabel="Nowe stanowisko"
        entries={positions.map((p) => ({
          id: p.id,
          name: p.name,
          usage: [
            p._count.users > 0
              ? pluralize(p._count.users, "pracownik", "pracowników", "pracowników")
              : null,
            p._count.projectRoles > 0
              ? pluralize(p._count.projectRoles, "rola", "role", "ról")
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          inUse: p._count.users > 0 || p._count.projectRoles > 0,
        }))}
      />

      <RateManager
        kind="position"
        title="Stawki stanowisk"
        description="Stawka godzinowa używana, gdy pracownik nie ma własnej. Nowa stawka nie nadpisuje poprzedniej — w kosztach liczy się od dnia podanego w „Obowiązuje od” (także w połowie miesiąca), a wcześniejsze dni zostają po starej stawce."
        owners={positionRates.map((p) => ({
          id: p.id,
          label: p.name,
          rates: serializeRates(p.rates),
        }))}
      />

      <RateManager
        kind="employee"
        title="Stawki pracowników"
        description="Stawka własna pracownika ma pierwszeństwo nad stawką stanowiska — od dnia, od którego obowiązuje. Przed tą datą koszt liczy się stawką stanowiska, na które pracownik jest obsadzony w danej roli projektu."
        owners={employees.map((e) => ({
          id: e.id,
          label: `${e.firstName} ${e.lastName}`,
          sublabel: [
            e.position?.name ?? "brak stanowiska",
            e.status === "inactive" ? "nieaktywny" : null,
          ]
            .filter(Boolean)
            .join(" · "),
          rates: serializeRates(e.rates),
        }))}
      />

      <DictionaryManager
        kind="skill"
        title="Kompetencje"
        description="Tagi przypisywane pracownikom, używane w filtrach obłożenia."
        addLabel="Nowa kompetencja"
        entries={skills.map((s) => ({
          id: s.id,
          name: s.name,
          usage:
            s._count.users > 0
              ? pluralize(s._count.users, "osoba", "osoby", "osób")
              : "",
          inUse: s._count.users > 0,
        }))}
      />
    </div>
  );
}
