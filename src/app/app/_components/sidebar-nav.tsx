"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarRange,
  Gauge,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Capability } from "@/lib/permissions";

// Widoczność pozycji wynika z macierzy uprawnień, nie z nazwy roli — jedno
// źródło prawdy dla nawigacji i dla guardów na stronach. `null` = każdy
// zalogowany.
const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  requires: Capability | null;
}[] = [
  { href: "/app", label: "Panel", icon: LayoutDashboard, requires: null },
  { href: "/app/pracownicy", label: "Pracownicy", icon: Users, requires: "manageEmployees" },
  { href: "/app/zasoby", label: "Zasoby", icon: Gauge, requires: "viewResources" },
  { href: "/app/projekty", label: "Projekty", icon: FolderKanban, requires: "viewProjects" },
  { href: "/app/timeline", label: "Timeline", icon: CalendarRange, requires: "viewProjects" },
  { href: "/app/ustawienia", label: "Ustawienia", icon: Settings, requires: "manageDictionaries" },
];

export function SidebarNav({ capabilities }: { capabilities: Capability[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems
        .filter((item) => item.requires === null || capabilities.includes(item.requires))
        .map((item) => {
        const isActive =
          item.href === "/app"
            ? pathname === "/app"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
              isActive
                ? "bg-primary/10 text-primary before:absolute before:top-1/2 before:left-0 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
