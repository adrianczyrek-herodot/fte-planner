import * as z from "zod";

import "@/lib/validation/locale";

import { decimalInput, optionalDayDate } from "@/lib/validation/date";

// Puste → null; inaczej dzień (UTC-północ) z rozsądnego zakresu lat. Parsowanie
// tutaj (a nie w akcji) sprawia, że zła data jest błędem pola, a nie wyjątkiem.
const optionalDate = optionalDayDate;

// Puste → null; inaczej nieujemna kwota mieszcząca się w kolumnie Decimal(12,2).
const optionalBudget = z.preprocess(
  (value) => {
    const v = decimalInput(value);
    return typeof v === "string" && v !== "" ? v : null;
  },
  z.coerce
    .number({ error: "Budżet musi być liczbą." })
    .min(0, { error: "Budżet nie może być ujemny." })
    .max(9_999_999_999.99, { error: "Budżet jest zbyt duży." })
    .nullable()
);

// Puste → null; inaczej poprawny adres http(s). Ograniczenie do tych dwóch
// schematów jest celowe — pole ma trzymać link do karty czy tablicy, a nie
// dowolny URI (mailto:, javascript: itd.).
const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null,
  z
    .url({ protocol: /^https?$/, error: "Podaj adres zaczynający się od http:// lub https://." })
    .max(2048, { error: "Adres jest zbyt długi." })
    .nullable()
);

/** Linki dodatkowe projektu — klucz w bazie → etykieta w interfejsie. */
export const PROJECT_LINK_FIELDS = [
  { key: "projectCardUrl", label: "Karta projektu" },
  { key: "riskCardUrl", label: "Karta ryzyk" },
  { key: "confluenceUrl", label: "Confluence" },
  { key: "miroUrl", label: "Miro" },
  { key: "domainUrl", label: "Domena" },
] as const;

export type ProjectLinkKey = (typeof PROJECT_LINK_FIELDS)[number]["key"];

export const ProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Nazwa jest wymagana." })
      .max(120, { error: "Nazwa może mieć najwyżej 120 znaków." }),
    description: z
      .string()
      .trim()
      .max(2000, { error: "Opis może mieć najwyżej 2000 znaków." })
      .optional(),
    startDate: optionalDate,
    endDate: optionalDate,
    budget: optionalBudget,
    projectCardUrl: optionalUrl,
    riskCardUrl: optionalUrl,
    confluenceUrl: optionalUrl,
    miroUrl: optionalUrl,
    domainUrl: optionalUrl,
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
        description?: string[];
        startDate?: string[];
        endDate?: string[];
        budget?: string[];
        projectCardUrl?: string[];
        riskCardUrl?: string[];
        confluenceUrl?: string[];
        miroUrl?: string[];
        domainUrl?: string[];
      };
      message?: string;
    }
  | undefined;

// Limit wyznacza Vercel: żądanie do funkcji może mieć najwyżej 4,5 MB, a plik
// jedzie w nim razem z narzutem formularza. Ten sam limit sprawdza przeglądarka
// (od razu, przed wysyłką) i serwer.
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENT_LABEL = "4 MB";
