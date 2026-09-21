// Jedna macierz uprawnień dla całej aplikacji. Wcześniej różnice między rolami
// wynikały z tego, jaki guard ktoś postawił na danej stronie — łatwo było o
// niespójność i nie dało się odpowiedzieć na pytanie „co widzi menedżer?"
// bez czytania wszystkich plików.

export const ROLES = ["user", "manager", "finance", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const roleLabels: Record<Role, string> = {
  user: "pracownik",
  manager: "menedżer",
  finance: "administracja",
  admin: "administrator",
};

/**
 * Uprawnienia opisują CZYNNOŚCI, nie ekrany — dzięki temu jedna zdolność może
 * być sprawdzana i na stronie, i przy pojedynczym polu (np. stawki).
 */
export const CAPABILITIES = [
  // Własne dane
  "viewOwnAssignments",
  // Projekty i obsada
  "viewProjects",
  "manageProjects",
  "manageStaffing",
  // Widok obłożenia i karty pracowników
  "viewResources",
  // Konta pracowników (dodawanie, dezaktywacja, rola)
  "manageEmployees",
  // Słowniki stanowisk i kompetencji
  "manageDictionaries",
  // Dane kosztowe — wdrażane w kolejnym etapie, ale rola „administracja"
  // istnieje właśnie po to, żeby móc je wpisywać bez wglądu w resztę.
  "viewRates",
  "manageRates",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const MATRIX: Record<Role, readonly Capability[]> = {
  // Pracownik widzi wyłącznie własne zaangażowanie.
  user: ["viewOwnAssignments"],

  // Menedżer planuje projekty i obsadę, ale nie zarządza kontami ani
  // słownikami i nie widzi stawek.
  manager: [
    "viewOwnAssignments",
    "viewProjects",
    "manageProjects",
    "manageStaffing",
    "viewResources",
  ],

  // Administracja kadrowo-finansowa: słowniki i stawki. Bez planowania
  // projektów — wpisuje dane, nie podejmuje decyzji o obsadzie.
  finance: ["viewOwnAssignments", "viewResources", "manageDictionaries", "viewRates", "manageRates"],

  // Administrator ma wszystko.
  admin: [...CAPABILITIES],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role].includes(capability);
}

/** Wszystkie uprawnienia roli — do wyliczenia nawigacji po stronie klienta. */
export function capabilitiesOf(role: Role): Capability[] {
  return [...MATRIX[role]];
}
