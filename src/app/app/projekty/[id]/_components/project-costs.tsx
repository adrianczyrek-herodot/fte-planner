"use client";

import type { ReactNode } from "react";
import { useActionState, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";

import { addCostItem, deleteCostItem } from "@/app/actions/rates";
import { formatGrosze } from "@/lib/cost";
import { COST_CATEGORIES } from "@/lib/validation/rate";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { formatMonthLabel, formatYmdRange } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/info-hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PersonCost = {
  assignmentId: string;
  userId: string;
  name: string;
  rolePosition: string;
  startDate: string;
  endDate: string;
  fte: number;
  hours: number;
  grosze: number;
  /** Miesiące bez żadnej stawki — koszt tej osoby jest niedoszacowany. */
  monthsWithoutRate: string[];
  rateSource: "employee" | "position" | null;
};

type CostItem = {
  id: string;
  name: string;
  category: string;
  amount: string;
};

type Summary = {
  laborGrosze: number;
  extraGrosze: number;
  totalGrosze: number;
  budgetGrosze: number | null;
  marginGrosze: number | null;
  marginPercent: number | null;
  monthsWithoutRate: number;
};

const categoryLabel = Object.fromEntries(
  COST_CATEGORIES.map((c) => [c.value, c.label])
) as Record<string, string>;

export function ProjectCosts({
  projectId,
  people,
  items,
  summary,
}: {
  projectId: string;
  people: PersonCost[];
  items: CostItem[];
  summary: Summary;
}) {
  const [state, formAction, pending] = useActionState(
    addCostItem.bind(null, projectId),
    undefined
  );
  const [formKey, setFormKey] = useState(0);
  useActionEffect(state, (s) => {
    if (s?.success) setFormKey((k) => k + 1);
  });

  return (
    <div data-section="costs" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Koszty i marża</h2>

      {summary.monthsWithoutRate > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {summary.monthsWithoutRate}{" "}
            {summary.monthsWithoutRate === 1 ? "miesiąc przydziału nie ma" : "miesięcy przydziałów nie ma"}{" "}
            stawki — koszt jest niedoszacowany, a marża wygląda lepiej, niż jest.
            Uzupełnij stawki w Ustawieniach.
          </span>
        </p>
      )}

      {/* --- Zestawienie --- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Wynagrodzenia"
          value={formatGrosze(summary.laborGrosze)}
          explain={
            <>
              Koszt osób z tabeli poniżej. Dla każdego miesiąca przydziału:
              godziny × stawka godzinowa, gdzie godziny = FTE × dni robocze ×
              8 h. Dni robocze to poniedziałki–piątki pomniejszone o dni
              ustawowo wolne od pracy. Nie uwzględniamy natomiast urlopów ani
              zwolnień. Stawka to własna stawka pracownika, a gdy jej nie ma —
              stawka jego stanowiska; obowiązuje ta z pierwszego dnia miesiąca.
            </>
          }
        />
        <Tile
          label="Koszty dodatkowe"
          value={formatGrosze(summary.extraGrosze)}
          explain="Suma pozycji dodanych ręcznie w sekcji poniżej (narzędzia, sprzęt, licencje). Nie wynikają z obsady ani ze stawek."
        />
        <Tile
          label="Koszt razem"
          value={formatGrosze(summary.totalGrosze)}
          strong
          explain="Wynagrodzenia plus koszty dodatkowe. Miesiące bez stawki wchodzą tu jako zero, więc przy ostrzeżeniu powyżej kwota jest zaniżona."
        />
        <Tile
          label="Marża"
          value={
            summary.marginGrosze == null
              ? "—"
              : `${formatGrosze(summary.marginGrosze)}${
                  summary.marginPercent != null ? ` · ${summary.marginPercent}%` : ""
                }`
          }
          hint={summary.budgetGrosze == null ? "brak budżetu" : undefined}
          explain="Budżet projektu minus koszt razem. Procent to marża podzielona przez budżet. Bez ustawionego budżetu nie ma czego porównywać, więc pole zostaje puste."
          tone={
            summary.marginGrosze == null
              ? "muted"
              : summary.marginGrosze < 0
                ? "bad"
                : "good"
          }
        />
      </div>

      {/* --- Koszt osób --- */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
              <th className="p-2.5 text-left font-medium">Osoba</th>
              <th className="p-2.5 text-left font-medium">Okres</th>
              <th className="p-2.5 text-right font-medium">
                <span className="flex items-center justify-end gap-1.5">
                  FTE
                  <InfoHint label="Jak liczymy: FTE">
                    Zaangażowanie z przydziału tej osoby na tej roli. 1.00 to
                    pełny etat przez cały okres przydziału.
                  </InfoHint>
                </span>
              </th>
              <th className="p-2.5 text-right font-medium">
                <span className="flex items-center justify-end gap-1.5">
                  Godziny
                  <InfoHint label="Jak liczymy: Godziny">
                    Suma po miesiącach przydziału: FTE × liczba dni roboczych
                    w danym miesiącu × 8 h. Dni robocze to poniedziałki–piątki
                    minus dni ustawowo wolne, także te ruchome, jak Poniedziałek
                    Wielkanocny czy Boże Ciało. Dlatego ta sama wartość FTE daje
                    inną liczbę godzin w styczniu i w lipcu. Urlopy i zwolnienia
                    nie są tu uwzględniane.
                  </InfoHint>
                </span>
              </th>
              <th className="p-2.5 text-right font-medium">Koszt</th>
            </tr>
          </thead>
          <tbody>
            {people.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Brak obsady — nie ma czego liczyć.
                </td>
              </tr>
            ) : (
              people.map((p) => (
                <tr key={p.assignmentId} className="border-b last:border-0">
                  <td className="p-2.5">
                    <div className="font-medium">{p.name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{p.rolePosition}</span>
                      {p.rateSource === "position" && (
                        <Badge variant="outline" className="font-normal">
                          stawka stanowiska
                        </Badge>
                      )}
                      {p.monthsWithoutRate.length > 0 && (
                        <Badge variant="warning" className="font-normal">
                          brak stawki:{" "}
                          {p.monthsWithoutRate.map(formatMonthLabel).join(", ")}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 whitespace-nowrap text-muted-foreground">
                    {formatYmdRange(p.startDate, p.endDate)}
                  </td>
                  <td className="p-2.5 text-right tabular-nums">{p.fte.toFixed(2)}</td>
                  <td className="p-2.5 text-right tabular-nums">{p.hours}</td>
                  <td className="p-2.5 text-right font-medium tabular-nums">
                    {formatGrosze(p.grosze)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- Koszty dodatkowe --- */}
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <h3 className="text-sm font-medium">Koszty dodatkowe</h3>

        {items.length > 0 && (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="outline" className="ml-2 font-normal">
                    {categoryLabel[item.category] ?? item.category}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-medium tabular-nums">
                    {formatGrosze(Math.round(Number(item.amount) * 100))}
                  </span>
                  <form action={deleteCostItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Usuń pozycję: ${item.name}`}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form key={formKey} action={formAction} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="cost-name" className="text-xs">
              Nazwa
            </Label>
            <Input id="cost-name" name="name" placeholder="np. Licencje Figma" required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="cost-category" className="text-xs">
              Kategoria
            </Label>
            <Select name="category" defaultValue="other">
              <SelectTrigger id="cost-category" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="cost-amount" className="text-xs">
              Kwota (PLN)
            </Label>
            <Input
              id="cost-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              className="w-32"
              required
            />
          </div>
          <Button type="submit" disabled={pending}>
            <Plus />
            {pending ? "Dodawanie…" : "Dodaj"}
          </Button>
        </form>

        {(state?.errors?.name || state?.errors?.amount) && (
          <p className="text-sm text-destructive">
            {state.errors.name?.[0] ?? state.errors.amount?.[0]}
          </p>
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  explain,
  strong,
  tone = "default",
}: {
  label: string;
  value: string;
  /** Krótki dopisek pod kwotą (np. „brak budżetu”). */
  hint?: string;
  /** Wyjaśnienie w dymku: skąd bierze się kwota. */
  explain?: ReactNode;
  strong?: boolean;
  tone?: "default" | "good" | "bad" | "muted";
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {explain && <InfoHint label={`Jak liczymy: ${label}`}>{explain}</InfoHint>}
      </div>
      <div
        className={cn(
          "mt-1 tabular-nums",
          strong ? "text-lg font-semibold" : "text-base font-medium",
          tone === "bad" && "text-destructive",
          tone === "good" && "text-primary",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
