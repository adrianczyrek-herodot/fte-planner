"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { rescheduleProject } from "@/app/actions/projects";
import {
  dateFromDayIndex,
  formatDayLabel,
  formatMonthLabel,
  monthSegments,
  ymd,
} from "@/lib/timeline";

const DAY_W = 8; // px na dzień
const HEADER_H = 32;
const ROW_H = 44;

type Row = {
  id: string;
  name: string;
  hasConflict: boolean;
  startDay: number;
  endDay: number;
};

type Span = { startDay: number; endDay: number };
type Mode = "move" | "left" | "right";

export function TimelineGantt({
  rangeStartDay,
  totalDays,
  todayDay,
  rows,
  incomplete,
}: {
  rangeStartDay: number;
  totalDays: number;
  todayDay: number;
  rows: Row[];
  incomplete: { id: string; name: string }[];
}) {
  const [positions, setPositions] = useState<Record<string, Span>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, { startDay: r.startDay, endDay: r.endDay }]))
  );
  const [dragId, setDragId] = useState<string | null>(null);

  const width = totalDays * DAY_W;
  const months = monthSegments(rangeStartDay, totalDays);
  const innerHeight = HEADER_H + rows.length * ROW_H;
  const x = (day: number) => (day - rangeStartDay) * DAY_W;

  function startDrag(e: React.PointerEvent, id: string, mode: Mode) {
    e.preventDefault();
    e.stopPropagation();

    const orig = positions[id];
    const startX = e.clientX;
    let latest = orig;

    const onMove = (ev: PointerEvent) => {
      const dx = Math.round((ev.clientX - startX) / DAY_W);
      let { startDay, endDay } = orig;
      if (mode === "move") {
        startDay = orig.startDay + dx;
        endDay = orig.endDay + dx;
      } else if (mode === "left") {
        startDay = Math.min(orig.startDay + dx, orig.endDay);
      } else {
        endDay = Math.max(orig.endDay + dx, orig.startDay);
      }
      latest = { startDay, endDay };
      setPositions((p) => ({ ...p, [id]: latest }));
    };

    const onUp = async () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragId(null);
      if (latest.startDay === orig.startDay && latest.endDay === orig.endDay) return;
      try {
        await rescheduleProject(
          id,
          ymd(dateFromDayIndex(latest.startDay)),
          ymd(dateFromDayIndex(latest.endDay))
        );
      } catch {
        setPositions((p) => ({ ...p, [id]: orig })); // cofnij przy błędzie
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    setDragId(id);
  }

  return (
    <div className="flex flex-col gap-3">
      {incomplete.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Bez pełnych dat (ustaw w edycji projektu, aby pojawiły się na osi):{" "}
          {incomplete.map((p) => p.name).join(", ")}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Brak projektów z datą rozpoczęcia i zakończenia.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <div
            className="relative select-none"
            style={{ width, height: innerHeight, minWidth: "100%" }}
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

            {/* nagłówek z miesiącami */}
            <div
              className="absolute inset-x-0 top-0 border-b bg-muted/20"
              style={{ height: HEADER_H }}
            >
              {months.map((seg) => (
                <span
                  key={`label-${seg.month}`}
                  className="absolute top-1.5 px-1.5 text-xs font-medium text-muted-foreground capitalize"
                  style={{ left: x(seg.startDay) }}
                >
                  {formatMonthLabel(seg.month)}
                </span>
              ))}
            </div>

            {/* wiersze z paskami */}
            {rows.map((row, i) => {
              const pos = positions[row.id];
              const left = x(pos.startDay);
              const barW = Math.max((pos.endDay - pos.startDay + 1) * DAY_W, DAY_W);
              const top = HEADER_H + i * ROW_H;
              return (
                <div
                  key={row.id}
                  className="absolute inset-x-0 border-b"
                  style={{ top, height: ROW_H }}
                >
                  <div
                    className="absolute top-2 flex items-center rounded-md bg-primary text-xs text-primary-foreground shadow-sm cursor-grab active:cursor-grabbing"
                    style={{ left, width: barW, height: ROW_H - 16 }}
                    onPointerDown={(e) => startDrag(e, row.id, "move")}
                    title={row.name}
                  >
                    <span
                      onPointerDown={(e) => startDrag(e, row.id, "left")}
                      className="h-full w-2 shrink-0 cursor-ew-resize rounded-l-md bg-black/20"
                    />
                    <span className="flex-1 truncate px-1">{row.name}</span>
                    {row.hasConflict && (
                      <AlertTriangle
                        className="mr-0.5 size-3.5 shrink-0 text-amber-300"
                        aria-label="Konflikt FTE: ktoś przypisany jest przeciążony"
                      />
                    )}
                    <span
                      onPointerDown={(e) => startDrag(e, row.id, "right")}
                      className="h-full w-2 shrink-0 cursor-ew-resize rounded-r-md bg-black/20"
                    />
                  </div>

                  {dragId === row.id && (
                    <div
                      className="pointer-events-none absolute -top-1 z-10 rounded bg-foreground px-2 py-1 text-[10px] whitespace-nowrap text-background"
                      style={{ left }}
                    >
                      {formatDayLabel(pos.startDay)} → {formatDayLabel(pos.endDay)} (
                      {pos.endDay - pos.startDay + 1} dni)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
