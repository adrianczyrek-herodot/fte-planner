export type ProjectDueStatus = "no-due-date" | "upcoming" | "overdue";

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
