import * as z from "zod";

import "@/lib/validation/locale";

import { dayString as day, decimalInput } from "@/lib/validation/date";

// FTE zapisujemy z dokładnością do setnych (Decimal(4,2)), więc minimum
// sprawdzamy PO zaokrągleniu — inaczej 0.004 przechodziło jako „większe od 0"
// i lądowało w bazie jako 0.00.
const atLeastHundredth = (v: number) => Math.round(v * 100) >= 1;

// --- Zapotrzebowanie na rolę (ProjectRole) ---------------------------------
// Puste → null; inaczej dodatnia liczba całkowita.
const optionalPeople = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null,
  z.coerce
    .number({ error: "Liczba osób musi być liczbą." })
    .int({ error: "Liczba osób musi być całkowita." })
    .gt(0, { error: "Liczba osób musi być większa od 0." })
    .max(999, { error: "Liczba osób zbyt duża." })
    .nullable()
);

export const ProjectRoleSchema = z
  .object({
    positionId: z.string().trim().min(1, { error: "Wybierz stanowisko." }),
    startDate: day,
    endDate: day,
    requiredFte: z.preprocess(
      decimalInput,
      z.coerce
        .number({ error: "Podaj wymagane FTE." })
        .refine(atLeastHundredth, { error: "FTE musi wynosić co najmniej 0,01." })
        .max(99, { error: "FTE zbyt duże." })
    ),
    requiredPeople: optionalPeople,
  })
  .refine((d) => d.startDate <= d.endDate, {
    error: "Data końcowa nie może być wcześniejsza niż początkowa.",
    path: ["endDate"],
  });

export type ProjectRoleFormState =
  | {
      success?: boolean;
      errors?: {
        positionId?: string[];
        startDate?: string[];
        endDate?: string[];
        requiredFte?: string[];
        requiredPeople?: string[];
      };
      message?: string;
    }
  | undefined;

// --- Obsada roli (Assignment) ----------------------------------------------
export const AssignmentSchema = z
  .object({
    userId: z.string().min(1, { error: "Wybierz pracownika." }),
    startDate: day,
    endDate: day,
    fte: z.preprocess(
      decimalInput,
      z.coerce
        .number({ error: "Podaj wartość FTE." })
        .refine(atLeastHundredth, { error: "FTE musi wynosić co najmniej 0,01." })
        .max(1, { error: "Pojedynczy przydział nie może przekraczać 1,00 FTE." })
    ),
  })
  .refine((d) => d.startDate <= d.endDate, {
    error: "Data końcowa nie może być wcześniejsza niż początkowa.",
    path: ["endDate"],
  });

export type AssignmentFormState =
  | {
      success?: boolean;
      conflict?: boolean;
      errors?: {
        userId?: string[];
        startDate?: string[];
        endDate?: string[];
        fte?: string[];
      };
      message?: string;
    }
  | undefined;
