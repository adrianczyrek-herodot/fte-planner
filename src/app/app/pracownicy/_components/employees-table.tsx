import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { isOverAllocated } from "@/lib/fte";
import { EmployeeRowActions } from "./employee-row-actions";

type Employee = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string | null;
  skills: string[];
  role: "user" | "manager" | "admin";
  status: "approved" | "inactive" | "pending";
  monthlyFte: number;
};

const roleLabel = { manager: "Menedżer", admin: "Administrator", user: "" } as const;

// Kompaktowy zapis FTE: 0.8, 1.4, 1 (bez zbędnych zer).
function formatFte(value: number) {
  return String(Number(value.toFixed(2)));
}

const statusMeta = {
  approved: { label: "Aktywny", variant: "secondary" },
  inactive: { label: "Nieaktywny", variant: "outline" },
  pending: { label: "Oczekuje", variant: "default" },
} as const;

export function EmployeesTable({
  employees,
  currentUserId,
  approvedCount,
  allSkills,
}: {
  employees: Employee[];
  currentUserId: string;
  approvedCount: number;
  allSkills: string[];
}) {
  if (employees.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Brak pracowników spełniających kryteria wyszukiwania.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imię i nazwisko</TableHead>
            <TableHead>Stanowisko</TableHead>
            <TableHead>Kompetencje</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Obciążenie</TableHead>
            <TableHead className="w-0">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {employee.firstName} {employee.lastName}
                  {employee.role !== "user" && (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      {roleLabel[employee.role]}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{employee.position ?? "—"}</TableCell>
              <TableCell>
                {employee.skills.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex max-w-64 flex-wrap gap-1">
                    {employee.skills.map((s) => (
                      <Badge key={s} variant="outline" className="font-normal">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={statusMeta[employee.status].variant}>
                  {statusMeta[employee.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    isOverAllocated(employee.monthlyFte) ? "destructive" : "secondary"
                  }
                >
                  {formatFte(employee.monthlyFte)}
                </Badge>
              </TableCell>
              <TableCell>
                <EmployeeRowActions
                  employee={employee}
                  isCurrentUser={employee.id === currentUserId}
                  isLastActive={employee.status === "approved" && approvedCount <= 1}
                  allSkills={allSkills}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
