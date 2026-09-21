import * as z from "zod";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
  error: "Miesiąc w formacie RRRR-MM.",
});

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
    startMonth: month,
    endMonth: month,
    requiredFte: z.coerce
      .number({ error: "Podaj wymagane FTE." })
      .gt(0, { error: "FTE musi być większe od 0." })
      .max(99, { error: "FTE zbyt duże." }),
    requiredPeople: optionalPeople,
  })
  .refine((d) => d.startMonth <= d.endMonth, {
    error: "Miesiąc końcowy nie może być wcześniejszy niż początkowy.",
    path: ["endMonth"],
  });

export type ProjectRoleFormState =
  | {
      success?: boolean;
      errors?: {
        positionId?: string[];
        startMonth?: string[];
        endMonth?: string[];
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
    startMonth: month,
    endMonth: month,
    fte: z.coerce
      .number({ error: "Podaj wartość FTE." })
      .gt(0, { error: "FTE musi być większe od 0." })
      .max(1, { error: "Pojedynczy przydział nie może przekraczać 1.00 FTE." }),
  })
  .refine((d) => d.startMonth <= d.endMonth, {
    error: "Miesiąc końcowy nie może być wcześniejszy niż początkowy.",
    path: ["endMonth"],
  });

export type AssignmentFormState =
  | {
      success?: boolean;
      conflict?: boolean;
      errors?: {
        userId?: string[];
        startMonth?: string[];
        endMonth?: string[];
        fte?: string[];
      };
      message?: string;
    }
  | undefined;
