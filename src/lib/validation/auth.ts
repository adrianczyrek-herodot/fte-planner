import * as z from "zod";

import "@/lib/validation/locale";

import { emailField } from "@/lib/validation/email";

export const SignupFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { error: "Imię jest wymagane." })
    .max(60, { error: "Imię może mieć najwyżej 60 znaków." }),
  lastName: z
    .string()
    .trim()
    .min(1, { error: "Nazwisko jest wymagane." })
    .max(80, { error: "Nazwisko może mieć najwyżej 80 znaków." }),
  email: emailField,
  password: z
    .string()
    .min(8, { error: "Hasło musi mieć co najmniej 8 znaków." })
    .regex(/[a-zA-Z]/, { error: "Hasło musi zawierać co najmniej jedną literę." })
    .regex(/[0-9]/, { error: "Hasło musi zawierać co najmniej jedną cyfrę." }),
});

export type SignupFormState =
  | {
      errors?: {
        firstName?: string[];
        lastName?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export const LoginFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, { error: "Hasło jest wymagane." }),
});

export type LoginFormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;
