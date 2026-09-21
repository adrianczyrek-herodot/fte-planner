export type ProjectDueStatus = "no-due-date" | "upcoming" | "overdue";

// Etykieta + wariant badge dla statusu terminu — jedno źródło prawdy dla listy
// projektów i strony szczegółów.
export const projectStatusMeta: Record<
  ProjectDueStatus,
  { label: string; variant: "secondary" | "destructive" }
> = {
  upcoming: { label: "Przed terminem", variant: "secondary" },
  overdue: { label: "Po terminie", variant: "destructive" },
  "no-due-date": { label: "Brak terminu", variant: "secondary" },
};

// Status liczony z daty zakończenia projektu: przyszła/dzisiejsza → "przed
// terminem", przeszła → "po terminie".
export function getProjectDueStatus(endDate: Date | null): ProjectDueStatus {
  if (!endDate) return "no-due-date";
  return endDate.getTime() >= Date.now() ? "upcoming" : "overdue";
}

export function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(date);
}

// Budżet w PLN, bez groszy — wspólny format dla listy i szczegółów projektu.
export function formatBudget(budget: number | null): string {
  if (budget == null) return "—";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
    useGrouping: "always",
  }).format(Number(budget));
}
