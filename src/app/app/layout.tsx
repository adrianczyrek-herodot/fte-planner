import { requireApprovedUser } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
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
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar sm:flex sm:flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Brand className="text-sm" />
        </div>
        <SidebarNav isAdmin={user.role === "admin"} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4">
          <Brand className="text-sm sm:hidden" />
          <span className="hidden sm:block" />
          <UserMenu
            name={user.name ?? user.email ?? "Użytkownik"}
            email={user.email ?? ""}
            role={user.role}
          />
        </header>

        <main className="flex-1 bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}
