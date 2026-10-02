import type { Metadata } from "next";
import { Suspense } from "react";

import { monthBounds } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/session";
import { employeeWorkload } from "@/lib/staffing";
import { todayInPoland, ym } from "@/lib/timeline";
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
  const { session } = await requireCapability("manageEmployees");

  const { q, skill } = await searchParams;
  const query = q?.trim() ?? "";
  const skillFilter = skill?.trim() ?? "";
  // Każde słowo musi pasować do imienia, nazwiska albo e-maila — dzięki temu
  // „Anna Kowalska" znajduje Annę Kowalską, a nie zero wyników.
  const words = query.split(/\s+/).filter(Boolean).slice(0, 5);

  // Bieżący miesiąc w formacie "YYYY-MM" — do kolumny "Obciążenie".
  const currentMonth = ym(todayInPoland());
  const { first: monthStart, last: monthEnd } = monthBounds(currentMonth);

  const [employees, approvedCount, loads, skillRows, positions] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: { in: ["pending", "approved", "inactive"] },
        ...(words.length > 0
          ? {
              AND: words.map((word) => ({
                OR: [
                  { firstName: { contains: word, mode: "insensitive" as const } },
                  { lastName: { contains: word, mode: "insensitive" as const } },
                  { email: { contains: word, mode: "insensitive" as const } },
                ],
              })),
            }
          : {}),
        ...(skillFilter
          ? { skills: { some: { name: { equals: skillFilter, mode: "insensitive" } } } }
          : {}),
      },
      // Oczekujący na zatwierdzenie trafiają na górę (kolejność enuma:
      // pending → approved → inactive), potem alfabetycznie.
      orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        anonymizedAt: true,
        passwordHash: true,
        positionId: true,
        position: { select: { name: true } },
        skills: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
    // Liczone niezależnie od filtra wyszukiwania — służy do zablokowania
    // dezaktywacji ostatniego aktywnego pracownika już w UI.
    prisma.user.count({ where: { status: "approved" } }),
    // Przydziały nachodzące na bieżący miesiąc — do kolumny "Obciążenie".
    prisma.assignment.findMany({
      where: {
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { id: true, userId: true, startDate: true, endDate: true, fte: true },
    }),
    // Słowniki: kompetencje do filtra i formularza, stanowiska do formularza.
    prisma.skill.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.position.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const allSkills = skillRows.map((s) => s.name);

  // Ta sama miara co w Zasobach i na karcie: udział w miesiącu, a
  // przeciążenie ze szczytu dziennego.
  const byUser = new Map<string, typeof loads>();
  for (const a of loads) {
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }
  const loadByUser = new Map(
    [...byUser].map(([userId, list]) => [
      userId,
      employeeWorkload(
        [currentMonth],
        list.map((a) => ({ ...a, fte: Number(a.fte) }))
      )[0],
    ])
  );
  const employeesWithLoad = employees.map((e) => ({
    id: e.id,
    email: e.email,
    firstName: e.firstName,
    lastName: e.lastName,
    role: e.role,
    status: e.status,
    anonymizedAt: e.anonymizedAt,
    hasPassword: e.passwordHash !== null,
    positionId: e.positionId,
    positionName: e.position?.name ?? null,
    skills: e.skills,
    monthlyFte: loadByUser.get(e.id)?.total ?? 0,
    isOverloaded: loadByUser.get(e.id)?.isOverloaded ?? false,
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
          positions={positions}
          skills={skillRows}
          trigger={<Button>Dodaj pracownika</Button>}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Suspense fallback={null}>
          <SearchInput initialQuery={query} />
        </Suspense>
        <Suspense fallback={null}>
          <SkillFilter
            skills={allSkills}
            initialSkill={
              allSkills.find((s) => s.toLowerCase() === skillFilter.toLowerCase()) ?? ""
            }
          />
        </Suspense>
      </div>

      <EmployeesTable
        employees={employeesWithLoad}
        currentUserId={session.user.id}
        approvedCount={approvedCount}
        positions={positions}
        skills={skillRows}
      />
    </div>
  );
}
