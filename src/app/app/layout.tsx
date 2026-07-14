import { requireApprovedUser } from "@/app/actions/auth";
import { SidebarNav } from "./_components/sidebar-nav";
import { UserMenu } from "./_components/user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireApprovedUser();
  const user = session.user;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r bg-card sm:flex sm:flex-col">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          FTE Planner
        </div>
        <SidebarNav isAdmin={user.role === "admin"} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <span className="text-sm font-medium text-muted-foreground sm:hidden">
            FTE Planner
          </span>
          <span className="hidden sm:block" />
          <UserMenu
            name={user.name ?? user.email ?? "Użytkownik"}
            email={user.email ?? ""}
            role={user.role}
          />
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
