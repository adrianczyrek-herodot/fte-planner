import * as z from "zod";

import "@/lib/validation/locale";

import { emailField } from "@/lib/validation/email";

const passwordRules = z
  .string()
  .min(8, { error: "Hasło musi mieć co najmniej 8 znaków." })
  .regex(/[a-zA-Z]/, { error: "Hasło musi zawierać co najmniej jedną literę." })
  .regex(/[0-9]/, { error: "Hasło musi zawierać co najmniej jedną cyfrę." });

export const SetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordRules,
    confirmPassword: z.string().min(1, { error: "Powtórz hasło." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Hasła nie są takie same.",
    path: ["confirmPassword"],
  });

export type SetPasswordFormState =
  | {
      success?: boolean;
      errors?: {
        password?: string[];
        confirmPassword?: string[];
      };
      message?: string;
    }
  | undefined;

export const RequestResetSchema = z.object({
  email: emailField,
});

export type RequestResetFormState =
  | {
      success?: boolean;
      errors?: {
        email?: string[];
      };
      message?: string;
    }
  | undefined;
