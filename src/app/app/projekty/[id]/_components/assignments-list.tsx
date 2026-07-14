import { Trash2 } from "lucide-react";

import { deleteAssignment } from "@/app/actions/assignments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignmentEditDialog } from "./assignment-edit-dialog";

type Employee = { id: string; firstName: string; lastName: string };

type AssignmentRow = {
  id: string;
  userId: string;
  month: string;
  fte: string; // Decimal zserializowany do stringa
  isConflict: boolean;
  user: { firstName: string; lastName: string };
};

export function AssignmentsList({
  assignments,
  projectId,
  employees,
}: {
  assignments: AssignmentRow[];
  projectId: string;
  employees: Employee[];
}) {
  if (assignments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Brak przydziałów do tego projektu.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pracownik</TableHead>
            <TableHead>Miesiąc</TableHead>
            <TableHead>FTE</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">
                {a.user.firstName} {a.user.lastName}
              </TableCell>
              <TableCell>{a.month}</TableCell>
              <TableCell>{Number(a.fte).toFixed(2)}</TableCell>
              <TableCell>
                {a.isConflict ? (
                  <Badge variant="destructive">Konflikt</Badge>
                ) : (
                  <Badge variant="secondary">OK</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <AssignmentEditDialog
                    projectId={projectId}
                    employees={employees}
                    assignment={{
                      id: a.id,
                      userId: a.userId,
                      month: a.month,
                      fte: a.fte,
                    }}
                  />
                  <form action={deleteAssignment}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      aria-label="Usuń przydział"
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
