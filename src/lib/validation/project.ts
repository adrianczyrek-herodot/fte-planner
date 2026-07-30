import * as z from "zod";

// Empty/blank input → null; anything else must parse as a valid date.
// Parsing here (instead of re-reading the raw FormData in the action) means a
// malformed date surfaces as a field error rather than crashing Prisma.
const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null,
  z.coerce.date({ error: "Nieprawidłowa data." }).nullable()
);

// Puste → null; inaczej nieujemna liczba.
const optionalBudget = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null,
  z.coerce
    .number({ error: "Budżet musi być liczbą." })
    .min(0, { error: "Budżet nie może być ujemny." })
    .nullable()
);

export const ProjectSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Nazwa jest wymagana." }),
    description: z.string().trim().optional(),
    startDate: optionalDate,
    endDate: optionalDate,
    budget: optionalBudget,
  })
  // Jeśli obie daty podane, zakończenie nie może być wcześniejsze niż rozpoczęcie.
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.startDate <= data.endDate,
    {
      error: "Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.",
      path: ["endDate"],
    }
  );

export type ProjectFormState =
  | {
      success?: boolean;
      errors?: {
        name?: string[];
        startDate?: string[];
        endDate?: string[];
        budget?: string[];
      };
      message?: string;
    }
  | undefined;
