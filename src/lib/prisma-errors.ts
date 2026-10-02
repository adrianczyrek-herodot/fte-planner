// Rozpoznawanie typowych błędów Prismy bez importowania klas z wygenerowanego
// klienta — wystarczy kod błędu.

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === code
  );
}

/** Rekord, który miał zostać zmieniony lub usunięty, już nie istnieje (P2025). */
export function isRecordNotFound(error: unknown): boolean {
  return hasCode(error, "P2025");
}

/** Naruszenie unikalności, np. dwie osoby jednocześnie dodają tę samą nazwę (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return hasCode(error, "P2002");
}

/**
 * Wykonuje zmianę, a gdy rekordu już nie ma (usunięty w innej karcie albo przez
 * kogoś innego), zwraca null zamiast rzucać. Bez tego takie kliknięcie kończyło
 * się pełnoekranowym błędem serwera.
 */
export async function ignoreMissing<T>(operation: Promise<T>): Promise<T | null> {
  try {
    return await operation;
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    throw error;
  }
}
