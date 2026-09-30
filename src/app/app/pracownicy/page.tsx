import type { Metadata } from "next";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/app/actions/auth";
import { sumFte } from "@/lib/fte";
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

  // Bieżący miesiąc w formacie "YYYY-MM" — do kolumny "Obciążenie".
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [employees, approvedCount, loads, skillRows, positions] = await Promise.all([
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
        ...(skillFilter ? { skills: { some: { name: skillFilter } } } : {}),
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
        startMonth: { lte: currentMonth },
        endMonth: { gte: currentMonth },
      },
      select: { userId: true, fte: true },
    }),
    // Słowniki: kompetencje do filtra i formularza, stanowiska do formularza.
    prisma.skill.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.position.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const allSkills = skillRows.map((s) => s.name);

  const ftesByUser = new Map<string, number[]>();
  for (const a of loads) {
    const list = ftesByUser.get(a.userId) ?? [];
    list.push(Number(a.fte));
    ftesByUser.set(a.userId, list);
  }
  const loadByUser = new Map(
    [...ftesByUser].map(([userId, ftes]) => [userId, sumFte(ftes)])
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
          <SkillFilter skills={allSkills} initialSkill={skillFilter} />
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
