import * as z from "zod";

// Kompetencje/narzędzia jako tagi — z FormData przychodzą jako wiele wartości.
const skills = z
  .array(z.string().trim().min(1).max(40))
  .max(30)
  .default([])
  .transform((arr) => Array.from(new Set(arr)));

const role = z.enum(["user", "manager", "admin"]).default("user");

export const EmployeeCreateSchema = z.object({
  email: z.email({ error: "Podaj poprawny adres e-mail." }).trim(),
  firstName: z.string().trim().min(1, { error: "Imię jest wymagane." }),
  lastName: z.string().trim().min(1, { error: "Nazwisko jest wymagane." }),
  position: z.string().trim().min(1, { error: "Stanowisko jest wymagane." }),
  skills,
  role,
});

export const EmployeeUpdateSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1, { error: "Imię jest wymagane." }),
  lastName: z.string().trim().min(1, { error: "Nazwisko jest wymagane." }),
  position: z.string().trim().min(1, { error: "Stanowisko jest wymagane." }),
  skills,
  role,
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
