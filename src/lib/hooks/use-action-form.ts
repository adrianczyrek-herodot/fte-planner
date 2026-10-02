import { useActionState, useState, useTransition, type FormEvent } from "react";

/**
 * Jak `useActionState`, ale zamiast funkcji do `<form action>` zwraca handler
 * do `<form onSubmit>`.
 *
 * Powód: formularz wysłany przez `action` React 19 po zakończeniu akcji
 * automatycznie RESETUJE — także wtedy, gdy serwer odrzucił dane. Użytkownik
 * widział komunikat błędu nad pustymi polami i musiał wpisywać wszystko od
 * nowa. Wysyłka przez `onSubmit` zostawia wpisane wartości; formularze, które
 * po sukcesie mają się wyczyścić, robią to same (np. remontem przez `key`).
 *
 * Walidacja przeglądarki (`required`, `min`…) działa jak wcześniej — `submit`
 * nie odpala się, dopóki pola jej nie przejdą.
 */
export function useActionForm<S>(
  action: (state: Awaited<S>, formData: FormData) => S | Promise<S>,
  initialState: Awaited<S>
) {
  const [state, dispatch, pending] = useActionState(action, initialState);
  const [, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return [state, onSubmit, pending] as const;
}

/**
 * Wynik akcji, ale tylko taki, który powstał po ostatniej zmianie `resetKey`
 * (np. po ponownym otwarciu dialogu). Bez tego dialog zamknięty z błędem
 * pokazywał po ponownym otwarciu stary komunikat nad pustym formularzem.
 */
export function useFreshState<S>(state: S, resetKey: unknown): S | undefined {
  const [snapshot, setSnapshot] = useState({ key: resetKey, state });
  if (snapshot.key !== resetKey) {
    setSnapshot({ key: resetKey, state });
    return undefined;
  }
  return state === snapshot.state ? undefined : state;
}
