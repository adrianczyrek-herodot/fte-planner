import type { Metadata } from "next";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/actions/auth";
import { SearchInput } from "./_components/search-input";
import { SkillFilter } from "./_components/skill-filter";
import { EmployeesTable } from "./_components/employees-table";
import { EmployeeFormDialog } from "./_components/employee-form-dialog";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pracownicy — FTE Planner",
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; skill?: string }>;
}) {
  // Layouts don't reliably re-render on client-side navigation (Next.js
  // partial rendering), so re-check auth here too rather than relying
  // solely on the shared /app layout.
  const session = await requireAdmin();

  const { q, skill } = await searchParams;
  const query = q?.trim() ?? "";
  const skillFilter = skill?.trim() ?? "";

  // Bieżący miesiąc w formacie "YYYY-MM" — do kolumny "Obciążenie".
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [employees, approvedCount, loads, skillRows] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: { in: ["pending", "approved", "inactive"] },
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(skillFilter ? { skills: { has: skillFilter } } : {}),
      },
      // Oczekujący na zatwierdzenie trafiają na górę (kolejność enuma:
      // pending → approved → inactive), potem alfabetycznie.
      orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        position: true,
        skills: true,
        status: true,
      },
    }),
    // Liczone niezależnie od filtra wyszukiwania — służy do zablokowania
    // dezaktywacji ostatniego aktywnego pracownika już w UI.
    prisma.user.count({ where: { status: "approved" } }),
    // Suma FTE per pracownik w bieżącym miesiącu (jedno zapytanie zamiast N).
    prisma.assignment.groupBy({
      by: ["userId"],
      where: { month: currentMonth },
      _sum: { fte: true },
    }),
    // Wszystkie kompetencje (do filtra i podpowiedzi w formularzu).
    prisma.user.findMany({ select: { skills: true } }),
  ]);

  const allSkills = Array.from(
    new Set(skillRows.flatMap((r) => r.skills))
  ).sort((a, b) => a.localeCompare(b, "pl"));

  const loadByUser = new Map(
    loads.map((l) => [l.userId, Number(l._sum.fte ?? 0)])
  );
  const employeesWithLoad = employees.map((e) => ({
    ...e,
    monthlyFte: loadByUser.get(e.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pracownicy</h1>
          <p className="text-muted-foreground">
            Zarządzaj danymi profilowymi pracowników i ich dostępnością.
          </p>
        </div>
        <EmployeeFormDialog
          mode="create"
          allSkills={allSkills}
          trigger={<Button>Dodaj pracownika</Button>}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Suspense fallback={null}>
          <SearchInput initialQuery={query} />
        </Suspense>
        <Suspense fallback={null}>
          <SkillFilter skills={allSkills} initialSkill={skillFilter} />
        </Suspense>
      </div>

      <EmployeesTable
        employees={employeesWithLoad}
        currentUserId={session.user.id}
        approvedCount={approvedCount}
        allSkills={allSkills}
      />
    </div>
  );
}
