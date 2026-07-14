import type { Metadata } from "next";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/actions/auth";
import { SearchInput } from "./_components/search-input";
import { EmployeesTable } from "./_components/employees-table";
import { EmployeeFormDialog } from "./_components/employee-form-dialog";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pracownicy — FTE Planner",
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Layouts don't reliably re-render on client-side navigation (Next.js
  // partial rendering), so re-check auth here too rather than relying
  // solely on the shared /app layout.
  const session = await requireAdmin();

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const employees = await prisma.user.findMany({
    where: {
      status: { in: ["approved", "inactive"] },
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      position: true,
      status: true,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pracownicy</h1>
          <p className="text-muted-foreground">
            Zarządzaj danymi profilowymi pracowników i ich dostępnością.
          </p>
        </div>
        <EmployeeFormDialog mode="create" trigger={<Button>Dodaj pracownika</Button>} />
      </div>

      <Suspense fallback={null}>
        <SearchInput initialQuery={query} />
      </Suspense>

      <EmployeesTable employees={employees} currentUserId={session.user.id} />
    </div>
  );
}
