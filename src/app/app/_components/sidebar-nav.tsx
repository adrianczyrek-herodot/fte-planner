"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FolderKanban, CalendarRange } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Panel", icon: LayoutDashboard, enabled: true },
  { href: "/app/pracownicy", label: "Pracownicy", icon: Users, enabled: true },
  { href: "/app/projekty", label: "Projekty", icon: FolderKanban, enabled: false },
  { href: "/app/timeline", label: "Timeline", icon: CalendarRange, enabled: false },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
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
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
              isActive ? "bg-muted text-foreground" : "text-muted-foreground"
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
