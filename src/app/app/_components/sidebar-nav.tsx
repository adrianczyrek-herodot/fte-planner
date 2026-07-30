"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarRange,
  Gauge,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Panel", icon: LayoutDashboard, enabled: true, adminOnly: false },
  { href: "/app/pracownicy", label: "Pracownicy", icon: Users, enabled: true, adminOnly: true },
  { href: "/app/zasoby", label: "Zasoby", icon: Gauge, enabled: true, adminOnly: false },
  { href: "/app/projekty", label: "Projekty", icon: FolderKanban, enabled: true, adminOnly: false },
  { href: "/app/timeline", label: "Timeline", icon: CalendarRange, enabled: true, adminOnly: false },
];

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => {
        const isActive =
          item.href === "/app"
            ? pathname === "/app"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        if (!item.enabled) {
          return (
            <span
              key={item.href}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                {item.label}
              </span>
              <span className="text-xs">wkrótce</span>
            </span>
          );
        }

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
