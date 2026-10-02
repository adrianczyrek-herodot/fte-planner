"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Plus } from "lucide-react";

import { useActionForm } from "@/lib/hooks/use-action-form";
import { addRate, deleteRate } from "@/app/actions/rates";
import { formatGrosze, toGrosze } from "@/lib/cost";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { todayInPoland, ymd } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type RateRow = {
  id: string;
  hourlyRate: string; // PLN jako tekst, żeby nie przepuszczać Decimal do klienta
  validFrom: string; // "YYYY-MM-DD"
};

export type RateOwner = {
  id: string;
  label: string;
  sublabel?: string;
  rates: RateRow[];
};

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00.000Z`)
  );

/**
 * Stawka obowiązująca dziś: najpóźniejsza, która już weszła w życie. Stawka z
 * przyszłą datą jest zaplanowana, a nie aktualna — koszty liczą ją dopiero od
 * jej dnia. `rates` są posortowane od najnowszej.
 */
function currentRate(rates: RateRow[], today: string): RateRow | undefined {
  return rates.find((r) => r.validFrom <= today);
}

/**
 * Lista właścicieli stawek (stanowisk albo pracowników) z historią. Rozwijamy
 * pojedynczy wiersz, bo w typowym użyciu interesuje aktualna stawka — historia
 * jest potrzebna dopiero, gdy ktoś sprawdza, czym policzono stary miesiąc.
 */
export function RateManager({
  kind,
  title,
  description,
  owners,
}: {
  kind: "employee" | "position";
  title: string;
  description: string;
  owners: RateOwner[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const today = ymd(todayInPoland());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {owners.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Brak pozycji.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {owners.map((owner) => {
              const current = currentRate(owner.rates, today);
              const planned = owner.rates.filter((r) => r.validFrom > today);
              const isOpen = openId === owner.id;
              return (
                <li key={owner.id} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : owner.id)}
                    aria-expanded={isOpen}
                    className="flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-90"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{owner.label}</span>
                      {owner.sublabel && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {owner.sublabel}
                        </span>
                      )}
                    </span>
                    {current ? (
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {formatGrosze(toGrosze(Number(current.hourlyRate)))} / h
                        <span className="ml-2 font-normal text-muted-foreground">
                          od {fmtDate(current.validFrom)}
                        </span>
                      </span>
                    ) : (
                      <Badge variant="outline" className="shrink-0 font-normal">
                        {planned.length > 0 ? "brak stawki na dziś" : "brak stawki"}
                      </Badge>
                    )}
                    {planned.length > 0 && (
                      <Badge variant="outline" className="shrink-0 font-normal">
                        zaplanowana od {fmtDate(planned[planned.length - 1].validFrom)}
                      </Badge>
                    )}
                  </button>

                  {isOpen && (
                    <RateHistory kind={kind} owner={owner} currentId={current?.id} today={today} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RateHistory({
  kind,
  owner,
  currentId,
  today,
}: {
  kind: "employee" | "position";
  owner: RateOwner;
  currentId: string | undefined;
  today: string;
}) {
  const [state, formAction, pending] = useActionForm(
    addRate.bind(null, kind, owner.id),
    undefined
  );
  const [formKey, setFormKey] = useState(0);
  const [removing, startRemove] = useTransition();

  useActionEffect(state, (s) => {
    if (s?.success) setFormKey((k) => k + 1);
  });

  return (
    <div className="flex flex-col gap-3 border-t bg-muted/20 px-3 py-3">
      <form key={formKey} onSubmit={formAction} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`rate-${owner.id}`} className="text-xs">
            Stawka (zł/h)
          </Label>
          <Input
            id={`rate-${owner.id}`}
            name="hourlyRate"
            type="number"
            step="0.01"
            min="0.01"
            className="w-32"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`from-${owner.id}`} className="text-xs">
            Obowiązuje od
          </Label>
          <Input
            id={`from-${owner.id}`}
            name="validFrom"
            type="date"
            className="w-40"
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          <Plus />
          {pending ? "Dodawanie…" : "Dodaj stawkę"}
        </Button>
      </form>

      {state?.errors?.hourlyRate && (
        <p className="text-sm text-destructive">{state.errors.hourlyRate[0]}</p>
      )}
      {state?.errors?.validFrom && (
        <p className="text-sm text-destructive">{state.errors.validFrom[0]}</p>
      )}
      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {owner.rates.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Brak stawek. Koszt nie będzie liczony, dopóki nie dodasz pierwszej.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {owner.rates.map((rate) => (
            <li
              key={rate.id}
              className="flex items-center justify-between gap-3 rounded-md bg-card px-2.5 py-1.5 text-sm"
            >
              <span className="tabular-nums">
                {formatGrosze(toGrosze(Number(rate.hourlyRate)))} / h
                <span className="ml-2 text-muted-foreground">
                  od {fmtDate(rate.validFrom)}
                </span>
                {rate.id === currentId && (
                  <Badge variant="secondary" className="ml-2 font-normal">
                    aktualna
                  </Badge>
                )}
                {rate.validFrom > today && (
                  <Badge variant="outline" className="ml-2 font-normal">
                    zaplanowana
                  </Badge>
                )}
              </span>
              <ConfirmDelete
                label={`Usuń stawkę z ${fmtDate(rate.validFrom)}`}
                title="Usunąć stawkę?"
                description={`Stawka ${formatGrosze(toGrosze(Number(rate.hourlyRate)))} / h obowiązująca od ${fmtDate(rate.validFrom)} zostanie usunięta, a koszty projektów przeliczą się bez niej. Tej operacji nie można cofnąć.`}
                action={() => startRemove(async () => void (await deleteRate(kind, rate.id)))}
                fields={{}}
                disabled={removing}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
