export type ProjectDueStatus = "no-due-date" | "upcoming" | "overdue";

export function getProjectDueStatus(dueDate: Date | null): ProjectDueStatus {
  if (!dueDate) return "no-due-date";
  return dueDate.getTime() >= Date.now() ? "upcoming" : "overdue";
}

export function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(date);
}
