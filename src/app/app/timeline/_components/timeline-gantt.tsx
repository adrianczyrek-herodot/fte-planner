"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, ChevronRight, Undo2 } from "lucide-react";

import { rescheduleProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFte } from "@/lib/fte";
import { pluralize } from "@/lib/plural";
import {
  dateFromDayIndex,
  dayCount,
  formatDayLabel,
  formatDayRange,
  formatMonthLabel,
  monthSegments,
  ymd,
} from "@/lib/timeline";

const DAY_W = 8; // px na dzień
const LABEL_W = 260; // szerokość kolumny z nazwami projektów
const HEADER_H = 36;
const ROW_H = 52;
const CHILD_H = 34; // wiersz osoby pod projektem

type Person = {
  id: string;
  userId: string;
  name: string;
  rolePosition: string;
  fte: number;
  startDay: number;
  endDay: number;
  isConflict: boolean;
};

type Row = {
  id: string;
  name: string;
  hasConflict: boolean;
  startDay: number;
  endDay: number;
  people: Person[];
};

type Span = { startDay: number; endDay: number };
type Mode = "move" | "left" | "right";

export function TimelineGantt({
  rangeStartDay,
  totalDays,
  todayDay,
  rows,
  undated,
}: {
  rangeStartDay: number;
  totalDays: number;
  todayDay: number;
  rows: Row[];
  undated: { id: string; name: string }[];
}) {
  // Przeciąganie NIE zapisuje — odkłada zmianę tutaj. Zapis dopiero po
  // zatwierdzeniu, żeby przypadkowe szarpnięcie myszą nie przestawiło terminów.
  // Trzymamy wyłącznie nadpisania; źródłem prawdy zostają propsy z serwera,
  // dzięki czemu po zapisie wystarczy wyczyścić ten obiekt.
  const [staged, setStaged] = useState<Record<string, Span>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "warn"; text: string } | null>(
    null
  );
  const [saving, startSaving] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const router = useRouter();

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const original = (id: string): Span => {
    const row = rows.find((r) => r.id === id)!;
    return { startDay: row.startDay, endDay: row.endDay };
  };
  const spanOf = (id: string): Span => staged[id] ?? original(id);
  const isChanged = (id: string) => {
    const o = original(id);
    const s = spanOf(id);
    return s.startDay !== o.startDay || s.endDay !== o.endDay;
  };
  const changedIds = rows.map((r) => r.id).filter(isChanged);

  function discard() {
    setStaged({});
    setNotice(null);
  }

  function save() {
    setNotice(null);
    startSaving(async () => {
      const warnings: string[] = [];
      const errors: string[] = [];

      for (const id of changedIds) {
        const span = spanOf(id);
        const name = rows.find((r) => r.id === id)?.name ?? "projekt";
        try {
          const res = await rescheduleProject(
            id,
            ymd(dateFromDayIndex(span.startDay)),
            ymd(dateFromDayIndex(span.endDay))
          );
          if (!res.ok) errors.push(`${name}: ${res.message ?? "nie udało się zapisać"}`);
          else if (res.warning) warnings.push(res.warning);
        } catch {
          errors.push(`${name}: nie udało się zapisać zmiany`);
        }
      }

      if (errors.length > 0) {
        // Zostawiamy odłożone zmiany, żeby nie zgubić pracy przy błędzie.
        setNotice({ tone: "error", text: errors.join(" · ") });
        return;
      }

      setStaged({});
      if (warnings.length > 0) {
        setNotice({ tone: "warn", text: [...new Set(warnings)].join(" · ") });
      }
      // Odśwież dane z serwera, żeby propsy zgadzały się z bazą.
      router.refresh();
    });
  }

  const width = totalDays * DAY_W;
  const months = monthSegments(rangeStartDay, totalDays);
  const x = (day: number) => (day - rangeStartDay) * DAY_W;

  // Jedna lista wierszy dla obu kolumn — dzięki temu nazwy i paski nie mogą
  // się rozjechać, gdy któryś projekt jest rozwinięty.
  type Visual =
    | { kind: "project"; height: number; row: Row }
    | { kind: "person"; height: number; person: Person; parent: Row }
    | { kind: "undated"; height: number; project: { id: string; name: string } };

  const visual: Visual[] = [];
  for (const row of rows) {
    visual.push({ kind: "project", height: ROW_H, row });
    if (expanded.has(row.id)) {
      for (const person of row.people) {
        visual.push({ kind: "person", height: CHILD_H, person, parent: row });
      }
    }
  }
  for (const project of undated) {
    visual.push({ kind: "undated", height: ROW_H, project });
  }

  const tops: number[] = [];
  let cursor = HEADER_H;
  for (const v of visual) {
    tops.push(cursor);
    cursor += v.height;
  }
  const innerHeight = cursor;

  // Oś bywa dłuższa niż ekran, a interesuje nas teraźniejszość — po wejściu
  // przewijamy tak, by „dziś" wypadło blisko lewej krawędzi wykresu.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, x(todayDay) - 120);
    // Tylko przy wejściu — późniejsze przewijanie należy do użytkownika.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startDrag(e: React.PointerEvent, id: string, mode: Mode) {
    e.preventDefault();
    e.stopPropagation();

    // Punkt startowy to aktualny stan paska (także już odłożona zmiana),
    // żeby dało się poprawiać przesunięcie w kilku ruchach.
    const from = spanOf(id);

    const startX = e.clientX;

    const onMove = (ev: PointerEvent) => {
      const dx = Math.round((ev.clientX - startX) / DAY_W);
      let { startDay, endDay } = from;
      if (mode === "move") {
        startDay = from.startDay + dx;
        endDay = from.endDay + dx;
      } else if (mode === "left") {
        startDay = Math.min(from.startDay + dx, from.endDay);
      } else {
        endDay = Math.max(from.endDay + dx, from.startDay);
      }
      setStaged((p) => ({ ...p, [id]: { startDay, endDay } }));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragId(null);
      setNotice(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    setDragId(id);
  }

  if (rows.length === 0 && undated.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Brak projektów. Dodaj pierwszy projekt, aby zobaczyć go na osi czasu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Pasek zatwierdzania — jedyna droga, którą zmiana terminu trafia do bazy. */}
      {changedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="text-sm">
            <span className="font-medium">
              {changedIds.length === 1
                ? "Niezapisana zmiana terminu"
                : `Niezapisane zmiany terminów: ${changedIds.length}`}
            </span>
            <span className="text-muted-foreground">
              {" "}
              — {changedIds
                .map((id) => rows.find((r) => r.id === id)?.name)
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={discard} disabled={saving}>
              <Undo2 />
              Odrzuć
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Check />
              {saving ? "Zapisywanie…" : "Zapisz"}
            </Button>
          </div>
        </div>
      )}

      {notice && (
        <p
          className={cn(
            "rounded-lg border p-3 text-sm",
            notice.tone === "error"
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"
          )}
        >
          {notice.text}
        </p>
      )}

      <div ref={scrollRef} className="overflow-x-auto rounded-lg border">
        <div className="flex min-w-max">
          {/* --- Kolumna projektów: przyklejona przy przewijaniu w poziomie --- */}
          <div
            className="sticky left-0 z-20 shrink-0 border-r bg-card"
            style={{ width: LABEL_W }}
          >
            <div
              className="flex items-center border-b bg-muted/20 px-3 text-xs font-medium text-muted-foreground"
              style={{ height: HEADER_H }}
            >
              Projekt
            </div>

            {visual.map((v) => {
              if (v.kind === "undated") {
                return (
                  <div
                    key={`u-${v.project.id}`}
                    className="flex flex-col justify-center gap-0.5 border-b px-3"
                    style={{ height: v.height }}
                  >
                    <Link
                      href={`/app/projekty/${v.project.id}`}
                      className="truncate text-sm font-medium text-muted-foreground hover:underline"
                      title={v.project.name}
                    >
                      {v.project.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">Brak dat</div>
                  </div>
                );
              }

              if (v.kind === "person") {
                return (
                  <div
                    key={`p-${v.person.id}`}
                    className="flex items-center gap-1.5 border-b bg-muted/20 pr-3 pl-8"
                    style={{ height: v.height }}
                  >
                    <Link
                      href={`/app/pracownicy/${v.person.userId}`}
                      className="truncate text-xs font-medium hover:underline"
                      title={`${v.person.name} — ${v.person.rolePosition}`}
                    >
                      {v.person.name}
                    </Link>
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                      {formatFte(v.person.fte)} FTE
                    </span>
                  </div>
                );
              }

              const row = v.row;
              const pos = spanOf(row.id);
              const isDragging = dragId === row.id;
              const changed = isChanged(row.id);
              const isOpen = expanded.has(row.id);
              return (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-center gap-1 border-b pr-3 pl-1",
                    (isDragging || changed) && "bg-primary/5"
                  )}
                  style={{ height: v.height }}
                >
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    disabled={row.people.length === 0}
                    aria-expanded={isOpen}
                    aria-label={
                      row.people.length === 0
                        ? "Brak obsady do pokazania"
                        : isOpen
                          ? `Ukryj obsadę projektu ${row.name}`
                          : `Pokaż obsadę projektu ${row.name}`
                    }
                    title={
                      row.people.length === 0
                        ? "Brak obsady"
                        : `${pluralize(row.people.length, "osoba", "osoby", "osób")} na projekcie`
                    }
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded transition-colors",
                      row.people.length === 0
                        ? "cursor-default text-muted-foreground/40"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <ChevronRight
                      className={cn("size-4 transition-transform", isOpen && "rotate-90")}
                    />
                  </button>

                  <div className="flex min-w-0 flex-col justify-center gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/app/projekty/${row.id}`}
                        className="truncate text-sm font-medium hover:underline"
                        title={row.name}
                      >
                        {row.name}
                      </Link>
                      {row.hasConflict && (
                        <AlertTriangle
                          className="size-3.5 shrink-0 text-destructive"
                          aria-label="Konflikt FTE: ktoś przypisany jest przeciążony"
                        />
                      )}
                    </div>
                    {/* Daty jadą na żywo za paskiem podczas przeciągania. */}
                    <div
                      title={
                        changed
                          ? `Przed zmianą: ${formatDayRange(
                              original(row.id).startDay,
                              original(row.id).endDay
                            )}`
                          : undefined
                      }
                      className={cn(
                        "truncate text-xs tabular-nums",
                        isDragging || changed
                          ? "font-medium text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatDayRange(pos.startDay, pos.endDay)}
                      <span className="text-muted-foreground">
                        {" "}
                        · {pluralize(dayCount(pos.startDay, pos.endDay), "dzień", "dni", "dni")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* --- Oś czasu --- */}
          <div
            className="relative shrink-0 select-none"
            style={{ width, height: innerHeight }}
          >
            {/* pionowa siatka miesięcy */}
            {months.map((seg) => (
              <div
                key={`grid-${seg.month}`}
                className="absolute top-0 bottom-0 w-px bg-border/60"
                style={{ left: x(seg.startDay) }}
              />
            ))}

            {/* linia „dziś" */}
            <div
              className="absolute top-0 bottom-0 w-px bg-primary/50"
              style={{ left: x(todayDay) }}
            />
            <span
              className="absolute top-1 z-10 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none font-medium text-primary-foreground"
              style={{ left: x(todayDay) }}
            >
              dziś
            </span>

            {/* nagłówek z miesiącami */}
            <div
              className="absolute inset-x-0 top-0 border-b bg-muted/20"
              style={{ height: HEADER_H }}
            >
              {months.map((seg) => (
                <span
                  key={`label-${seg.month}`}
                  className="absolute top-2 px-1.5 text-xs font-medium text-muted-foreground capitalize"
                  style={{ left: x(seg.startDay) }}
                >
                  {formatMonthLabel(seg.month)}
                </span>
              ))}
            </div>

            {/* wiersze z paskami — ta sama lista i wysokości co w kolumnie nazw */}
            {visual.map((v, i) => {
              const top = tops[i];

              if (v.kind === "undated") {
                return (
                  <div
                    key={`u-${v.project.id}`}
                    className="absolute inset-x-0 border-b"
                    style={{ top, height: v.height }}
                  >
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
                      Ustaw daty w edycji projektu, aby pojawił się na osi.
                    </span>
                  </div>
                );
              }

              if (v.kind === "person") {
                const p = v.person;
                const left = x(p.startDay);
                const barW = Math.max(dayCount(p.startDay, p.endDay) * DAY_W, DAY_W);
                return (
                  <div
                    key={`p-${p.id}`}
                    className="absolute inset-x-0 border-b bg-muted/20"
                    style={{ top, height: v.height }}
                  >
                    {/* Pasek osoby nie jest przeciągany — obsadę zmienia się na
                        stronie projektu, a jej granulacja jest miesięczna. */}
                    <div
                      className={cn(
                        "absolute top-2 flex items-center gap-1 rounded px-1.5 text-[11px] font-medium",
                        p.isConflict
                          ? "bg-destructive/20 text-destructive"
                          : "bg-primary/25 text-primary"
                      )}
                      style={{ left, width: barW, height: CHILD_H - 16 }}
                      title={`${p.name} — ${p.rolePosition}: ${formatDayRange(p.startDay, p.endDay)}, ${formatFte(p.fte)} FTE`}
                    >
                      <span className="truncate">{p.rolePosition}</span>
                      <span className="shrink-0 tabular-nums">{formatFte(p.fte)}</span>
                    </div>
                  </div>
                );
              }

              const row = v.row;
              const pos = spanOf(row.id);
              const left = x(pos.startDay);
              const barW = Math.max(dayCount(pos.startDay, pos.endDay) * DAY_W, DAY_W);
              const isDragging = dragId === row.id;
              return (
                <div
                  key={row.id}
                  className={cn("absolute inset-x-0 border-b", isDragging && "bg-muted/40")}
                  style={{ top, height: v.height }}
                >
                  <div
                    className="absolute top-3 flex items-center rounded-md bg-primary text-primary-foreground shadow-sm cursor-grab active:cursor-grabbing"
                    style={{ left, width: barW, height: ROW_H - 24 }}
                    onPointerDown={(e) => startDrag(e, row.id, "move")}
                    title={`${row.name}: ${formatDayRange(pos.startDay, pos.endDay)}`}
                  >
                    <span
                      onPointerDown={(e) => startDrag(e, row.id, "left")}
                      className="h-full w-2 shrink-0 cursor-ew-resize rounded-l-md bg-black/20"
                      aria-label="Przesuń datę rozpoczęcia"
                    />
                    <span className="flex-1 overflow-hidden" />
                    {row.hasConflict && (
                      <AlertTriangle
                        className="mr-0.5 size-3.5 shrink-0 text-amber-300"
                        aria-label="Konflikt FTE: ktoś przypisany jest przeciążony"
                      />
                    )}
                    <span
                      onPointerDown={(e) => startDrag(e, row.id, "right")}
                      className="h-full w-2 shrink-0 cursor-ew-resize rounded-r-md bg-black/20"
                      aria-label="Przesuń datę zakończenia"
                    />
                  </div>

                  {isDragging && (
                    <div
                      className="pointer-events-none absolute top-0 z-10 rounded bg-foreground px-2 py-1 text-[10px] whitespace-nowrap text-background"
                      style={{ left }}
                    >
                      {formatDayLabel(pos.startDay)} → {formatDayLabel(pos.endDay)} (
                      {pluralize(dayCount(pos.startDay, pos.endDay), "dzień", "dni", "dni")})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
