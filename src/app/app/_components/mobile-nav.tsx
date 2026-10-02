"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import type { Capability } from "@/lib/permissions";
import { SidebarNav } from "./sidebar-nav";

// Na wąskich ekranach boczny pasek jest ukryty, więc ta sama nawigacja
// wysuwa się z lewej po kliknięciu przycisku w nagłówku.
export function MobileNav({ capabilities }: { capabilities: Capability[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="sm:hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Otwórz menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col border-r bg-sidebar shadow-lg">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <Brand className="text-sm" />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zamknij menu"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <SidebarNav capabilities={capabilities} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
