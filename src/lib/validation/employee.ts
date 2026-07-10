import * as z from "zod";

export const EmployeeCreateSchema = z.object({
  email: z.email({ error: "Podaj poprawny adres e-mail." }).trim(),
  firstName: z.string().trim().min(1, { error: "Imię jest wymagane." }),
  lastName: z.string().trim().min(1, { error: "Nazwisko jest wymagane." }),
  position: z.string().trim().min(1, { error: "Stanowisko jest wymagane." }),
});

export const EmployeeUpdateSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1, { error: "Imię jest wymagane." }),
  lastName: z.string().trim().min(1, { error: "Nazwisko jest wymagane." }),
  position: z.string().trim().min(1, { error: "Stanowisko jest wymagane." }),
});

export type EmployeeFormState =
  | {
      success?: boolean;
      errors?: {
        email?: string[];
        firstName?: string[];
        lastName?: string[];
        position?: string[];
      };
      message?: string;
    }
  | undefined;
