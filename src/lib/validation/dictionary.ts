import * as z from "zod";

import "@/lib/validation/locale";

export const DictionaryEntrySchema = z.object({
  // Wielokrotne i twarde spacje zamieniamy na jedną — inaczej „Tester" i
  // „Tester" z podwójną spacją wyglądały na liście identycznie, a były dwiema
  // różnymi pozycjami.
  name: z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(2, { error: "Nazwa musi mieć co najmniej 2 znaki." })
        .max(60, { error: "Nazwa może mieć najwyżej 60 znaków." })
    ),
});

export type DictionaryFormState =
  | {
      success?: boolean;
      errors?: { name?: string[] };
      message?: string;
    }
  | undefined;
