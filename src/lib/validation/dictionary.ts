import * as z from "zod";

export const DictionaryEntrySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Nazwa musi mieć co najmniej 2 znaki." })
    .max(60, { error: "Nazwa może mieć najwyżej 60 znaków." }),
});

export type DictionaryFormState =
  | {
      success?: boolean;
      errors?: { name?: string[] };
      message?: string;
    }
  | undefined;
