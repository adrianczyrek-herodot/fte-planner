import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/app/actions/auth";
import { auditActionLabels, isIrreversible, type AuditAction } from "@/lib/audit";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/info-hint";

export const metadata: Metadata = {
  title: "Dziennik zdarzeń — FTE Planner",
};

/** Ile ostatnich zdarzeń pokazujemy. Stronicowanie dołożymy, gdy będzie po co. */
const LIMIT = 100;

function formatMoment(at: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
    // Serwer (Vercel) działa w UTC — godziny pokazujemy w czasie polskim.
    timeZone: "Europe/Warsaw",
  }).format(at);
}

export default async function AuditLogPage() {
  await requireCapability("manageEmployees");

  const events = await prisma.auditEvent.findMany({
    orderBy: { at: "desc" },
    take: LIMIT,
  });

  // Nazwiska rozwiązujemy dopiero tutaj, bo w dzienniku ich nie ma. Efekt
  // uboczny jest pożądany: po anonimizacji stare wpisy same przestają pokazywać
  // czyjekolwiek imię.
  const userIds = [
    ...new Set(
      events.flatMap((e) => [e.actorId, e.targetUserId]).filter((id): id is string => !!id)
    ),
  ];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameById = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  /** Konto mogło zniknąć z bazy — wpis w dzienniku ma przetrwać mimo to. */
  function name(id: string | null): string {
    if (!id) return "—";
    return nameById.get(id) ?? "konto nieistniejące";
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          Dziennik zdarzeń
          <InfoHint label="Co trafia do dziennika">
            Zapisujemy operacje nieodwracalne oraz takie, które zmieniają czyjeś
            uprawnienia: usunięcie danych osobowych, aktywację i dezaktywację
            konta oraz zmianę roli. Zwykła edycja imienia czy kompetencji tu nie
            trafia. Sam dziennik nie przechowuje danych osobowych — wyłącznie
            identyfikatory; imiona poniżej są doczytywane na bieżąco, więc po
            anonimizacji znikają także ze starych wpisów.
          </InfoHint>
        </h1>
        <p className="text-muted-foreground">
          Ostatnie {LIMIT} zdarzeń, od najnowszego. Wpisów nie da się edytować
          ani usuwać z poziomu aplikacji.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Brak zdarzeń. Dziennik zapełni się przy pierwszej operacji na koncie
          pracownika.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="p-2.5 text-left font-medium whitespace-nowrap">Kiedy</th>
                <th className="p-2.5 text-left font-medium">Zdarzenie</th>
                <th className="p-2.5 text-left font-medium">Kogo dotyczy</th>
                <th className="p-2.5 text-left font-medium">Kto wykonał</th>
                <th className="p-2.5 text-left font-medium">Szczegóły</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="p-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatMoment(e.at)}
                  </td>
                  <td className="p-2.5">
                    <Badge
                      variant={
                        isIrreversible(e.action as AuditAction)
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {auditActionLabels[e.action as AuditAction]}
                    </Badge>
                  </td>
                  <td className="p-2.5">{name(e.targetUserId)}</td>
                  <td className="p-2.5">{name(e.actorId)}</td>
                  <td className="p-2.5 text-muted-foreground">{e.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
