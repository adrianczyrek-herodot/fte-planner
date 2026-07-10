import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmployeeRowActions } from "./employee-row-actions";

type Employee = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string | null;
  status: "approved" | "inactive" | "pending";
};

export function EmployeesTable({
  employees,
  currentUserId,
}: {
  employees: Employee[];
  currentUserId: string;
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
            <TableHead>E-mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-0">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">
                {employee.firstName} {employee.lastName}
              </TableCell>
              <TableCell>{employee.position ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{employee.email}</TableCell>
              <TableCell>
                <Badge variant={employee.status === "inactive" ? "outline" : "secondary"}>
                  {employee.status === "inactive" ? "Nieaktywny" : "Aktywny"}
                </Badge>
              </TableCell>
              <TableCell>
                <EmployeeRowActions
                  employee={employee}
                  isCurrentUser={employee.id === currentUserId}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
