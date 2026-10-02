import * as z from "zod";

import "@/lib/validation/locale";

import { dayDate, decimalInput } from "@/lib/validation/date";

export const RateSchema = z.object({
  hourlyRate: z.preprocess(
    decimalInput,
    z.coerce
      .number({ error: "Stawka musi być liczbą." })
      .gt(0, { error: "Stawka musi być większa od 0." })
      .max(100000, { error: "Stawka jest nierealnie wysoka." })
  ),
  // Data obowiązywania — dzień, od którego stawka liczy się w kosztach.
  validFrom: dayDate,
});

export type RateFormState =
  | {
      success?: boolean;
      errors?: { hourlyRate?: string[]; validFrom?: string[] };
      message?: string;
    }
  | undefined;

export const COST_CATEGORIES = [
  { value: "tools", label: "Narzędzia" },
  { value: "hardware", label: "Sprzęt" },
  { value: "software", label: "Oprogramowanie" },
  { value: "other", label: "Inne" },
] as const;

export const CostItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Nazwa musi mieć co najmniej 2 znaki." })
    .max(120, { error: "Nazwa jest zbyt długa." }),
  category: z.enum(["tools", "hardware", "software", "other"]).default("other"),
  amount: z.preprocess(
    decimalInput,
    z.coerce
      .number({ error: "Kwota musi być liczbą." })
      .gt(0, { error: "Kwota musi być większa od 0." })
      .max(100000000, { error: "Kwota jest nierealnie wysoka." })
  ),
});

export type CostItemFormState =
  | {
      success?: boolean;
      errors?: { name?: string[]; amount?: string[]; category?: string[] };
      message?: string;
    }
  | undefined;
