"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Znak zapytania przy metryce: skąd pochodzi liczba i jak jest liczona.
 *
 * Stan jest kontrolowany, żeby kliknięcie też otwierało dymek — sam Radix
 * reaguje na hover i focus, a na ekranie dotykowym żadne z nich nie zachodzi.
 * Trigger jest prawdziwym <button>, więc wchodzi w kolejność tabulacji i
 * czytnik ekranu zapowiada go razem z etykietą metryki.
 */
export function InfoHint({
  children,
  label = "Wyjaśnienie",
  className,
}: {
  children: React.ReactNode
  /** Czytany przez czytnik ekranu, gdy sam dymek jest jeszcze zamknięty. */
  label?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        type="button"
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex shrink-0 cursor-help text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          className
        )}
      >
        <HelpCircle className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}
