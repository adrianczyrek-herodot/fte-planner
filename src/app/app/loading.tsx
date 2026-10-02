// Pokazywane w trakcie wczytywania kolejnej strony aplikacji — bez tego
// kliknięcie w menu przy wolniejszej bazie wyglądało, jakby nic się nie działo.
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Wczytywanie">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
