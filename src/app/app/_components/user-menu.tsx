import { LogOut } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { roleLabels } from "@/lib/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Te same nazwy ról co w całej aplikacji (permissions.ts), tylko wielką literą.
const roleLabel = Object.fromEntries(
  Object.entries(roleLabels).map(([role, label]) => [
    role,
    label.charAt(0).toUpperCase() + label.slice(1),
  ])
) as Record<keyof typeof roleLabels, string>;

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: "user" | "manager" | "finance" | "admin";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
          <Avatar className="size-7">
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="font-medium">{name}</span>
          <span className="font-normal text-xs text-muted-foreground">{email}</span>
          <Badge variant={role === "user" ? "secondary" : "default"} className="w-fit">
            {roleLabel[role]}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOut />
              Wyloguj się
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
