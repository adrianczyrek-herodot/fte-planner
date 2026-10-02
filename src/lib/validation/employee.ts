import * as z from "zod";

import { emailField } from "@/lib/validation/email";

// Kompetencje wybierane ze słownika — z FormData przychodzą jako wiele
// wartości (identyfikatory), więc deduplikujemy.
const skillIds = z
  .array(z.string().trim().min(1))
  .max(30)
  .default([])
  .transform((arr) => Array.from(new Set(arr)));

// Radix Select nie przyjmuje pustej wartości, więc „brak stanowiska"
// formularz wysyła jako ten sentinel.
export const NO_POSITION = "__none__";

// Puste lub sentinel → null: stanowisko jest opcjonalne (konto może istnieć
// przed przypisaniem stanowiska), ale musi pochodzić ze słownika.
const positionId = z.preprocess(
  (v) =>
    typeof v === "string" && v.trim() !== "" && v.trim() !== NO_POSITION
      ? v.trim()
      : null,
  z.string().nullable()
);

const role = z.enum(["user", "manager", "finance", "admin"]).default("user");

export const EmployeeCreateSchema = z.object({
  email: emailField,
  firstName: z.string().trim().min(1, { error: "Imię jest wymagane." }),
  lastName: z.string().trim().min(1, { error: "Nazwisko jest wymagane." }),
  positionId,
  skillIds,
  role,
});

export const EmployeeUpdateSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1, { error: "Imię jest wymagane." }),
  lastName: z.string().trim().min(1, { error: "Nazwisko jest wymagane." }),
  positionId,
  skillIds,
  role,
});

export type EmployeeFormState =
  | {
      success?: boolean;
      errors?: {
        email?: string[];
        firstName?: string[];
        lastName?: string[];
        positionId?: string[];
      };
      message?: string;
    }
  | undefined;
