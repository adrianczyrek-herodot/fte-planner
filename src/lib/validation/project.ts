import * as z from "zod";

// Empty/blank input → null; anything else must parse as a valid date.
// Parsing here (instead of re-reading the raw FormData in the action) means a
// malformed date surfaces as a field error rather than crashing Prisma.
const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null,
  z.coerce.date({ error: "Nieprawidłowa data." }).nullable()
);

// Puste → null; inaczej nieujemna liczba.
const optionalBudget = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null,
  z.coerce
    .number({ error: "Budżet musi być liczbą." })
    .min(0, { error: "Budżet nie może być ujemny." })
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
    name: z.string().trim().min(1, { error: "Nazwa jest wymagana." }),
    description: z.string().trim().optional(),
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
