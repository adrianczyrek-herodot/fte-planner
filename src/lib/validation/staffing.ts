import * as z from "zod";

// Data dzienna. Sam regex nie odsiewa 31 lutego, więc dokładamy sprawdzenie,
// czy parser odtworzy dokładnie tę datę, którą dostał.
const day = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    error: "Data w formacie RRRR-MM-DD.",
  })
  .refine(
    (value) => {
      const [y, m, d] = value.split("-").map(Number);
      const parsed = new Date(Date.UTC(y, m - 1, d));
      return parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
    },
    { error: "Taka data nie istnieje." }
  );

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
    requiredFte: z.coerce
      .number({ error: "Podaj wymagane FTE." })
      .gt(0, { error: "FTE musi być większe od 0." })
      .max(99, { error: "FTE zbyt duże." }),
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
    fte: z.coerce
      .number({ error: "Podaj wartość FTE." })
      .gt(0, { error: "FTE musi być większe od 0." })
      .max(1, { error: "Pojedynczy przydział nie może przekraczać 1.00 FTE." }),
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
