import { useState } from "react";

/**
 * Uruchamia `effect(state)` dokładnie raz, gdy wynik akcji (`useActionState`)
 * zmieni się na nową instancję — np. po udanym wysłaniu formularza.
 *
 * To udokumentowany przez React sposób na dostrojenie stanu w reakcji na zmianę
 * wartości podczas renderu (bez cascading-render ryzyka z useEffect). Zastępuje
 * powtarzany ręcznie wzorzec porównywania z poprzednim stanem w komponentach.
 */
export function useActionEffect<S>(state: S, effect: (state: S) => void) {
  const [lastHandled, setLastHandled] = useState(state);
  if (state !== lastHandled) {
    setLastHandled(state);
    effect(state);
  }
}
