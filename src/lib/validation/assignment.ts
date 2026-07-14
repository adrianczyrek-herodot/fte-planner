import * as z from "zod";

export const AssignmentSchema = z.object({
  userId: z.string().min(1, { error: "Wybierz pracownika." }),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
      error: "Podaj miesiąc w formacie RRRR-MM.",
    }),
  fte: z.coerce
    .number({ error: "Podaj wartość FTE." })
    .gt(0, { error: "FTE musi być większe od 0." })
    .max(1, { error: "Pojedynczy przydział nie może przekraczać 1.00 FTE." }),
});

export type AssignmentFormState =
  | {
      success?: boolean;
      conflict?: boolean;
      errors?: {
        userId?: string[];
        month?: string[];
        fte?: string[];
      };
      message?: string;
    }
  | undefined;
