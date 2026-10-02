import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatFte } from "@/lib/fte";
import { InfoHint } from "@/components/info-hint";
import { EmployeeRowActions } from "./employee-row-actions";

type DictItem = { id: string; name: string };

type Employee = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  positionId: string | null;
  positionName: string | null;
  skills: DictItem[];
  role: "user" | "manager" | "finance" | "admin";
  status: "approved" | "inactive" | "pending";
  anonymizedAt: Date | null;
  monthlyFte: number;
  /** Czy w bieżącym miesiącu jest dzień roboczy z sumą FTE powyżej 1,00. */
  isOverloaded: boolean;
};

const roleLabel = {
  manager: "Menedżer",
  finance: "Administracja",
  admin: "Administrator",
  user: "",
} as const;

const statusMeta = {
  approved: { label: "Aktywny", variant: "secondary" },
  inactive: { label: "Nieaktywny", variant: "outline" },
  pending: { label: "Oczekuje", variant: "default" },
} as const;

export function EmployeesTable({
  employees,
  currentUserId,
  approvedCount,
  positions,
  skills,
}: {
  employees: Employee[];
  currentUserId: string;
  approvedCount: number;
  positions: DictItem[];
  skills: DictItem[];
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
            <TableHead>
              <span className="flex items-center gap-1.5">
                Kompetencje
                <InfoHint label="Skąd pochodzą kompetencje">
                  Ze słownika globalnego, wspólnego dla całej aplikacji. Listę
                  edytujesz w Ustawieniach, a przypisujesz ją osobie w formularzu
                  pracownika.
                </InfoHint>
              </span>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="flex items-center gap-1.5">
                Obciążenie
                <InfoHint label="Jak liczymy: Obciążenie">
                  Ile etatu zajmują przydziały tej osoby w bieżącym miesiącu:
                  przydział na pół miesiąca liczy się za połowę. 1,00 to pełny
                  etat. Czerwień oznacza przeciążenie — dzień roboczy, w którym
                  suma przydziałów przekracza 1,00 — nawet jeśli udział w
                  miesiącu jest niższy. Ta sama miara jest w Zasobach i na
                  karcie pracownika.
                </InfoHint>
              </span>
            </TableHead>
            <TableHead className="w-0">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/pracownicy/${employee.id}`}
                    className="max-w-[28ch] break-words hover:underline"
                  >
                    {employee.firstName} {employee.lastName}
                  </Link>
                  {employee.role !== "user" && (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      {roleLabel[employee.role]}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{employee.positionName ?? "—"}</TableCell>
              <TableCell>
                {employee.skills.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex max-w-64 flex-wrap gap-1">
                    {employee.skills.map((s) => (
                      <Badge key={s.id} variant="outline" className="font-normal">
                        {s.name}
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
                    employee.isOverloaded ? "destructive" : "secondary"
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
                  positions={positions}
                  skills={skills}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
