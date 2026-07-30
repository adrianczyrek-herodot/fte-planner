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

type Role = "user" | "manager" | "admin";

// access: "all" — każdy zalogowany; "manager" — menedżer/admin; "admin" — tylko admin.
const navItems = [
  { href: "/app", label: "Panel", icon: LayoutDashboard, access: "all" as const },
  { href: "/app/pracownicy", label: "Pracownicy", icon: Users, access: "admin" as const },
  { href: "/app/zasoby", label: "Zasoby", icon: Gauge, access: "manager" as const },
  { href: "/app/projekty", label: "Projekty", icon: FolderKanban, access: "manager" as const },
  { href: "/app/timeline", label: "Timeline", icon: CalendarRange, access: "manager" as const },
];

function canSee(access: "all" | "manager" | "admin", role: Role) {
  if (access === "all") return true;
  if (access === "manager") return role === "manager" || role === "admin";
  return role === "admin";
}

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems
        .filter((item) => canSee(item.access, role))
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
