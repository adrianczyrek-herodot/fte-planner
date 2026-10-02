import { getCurrentRole } from "@/lib/session";
import { Brand } from "@/components/brand";
import { MobileNav } from "./_components/mobile-nav";
import { SidebarNav } from "./_components/sidebar-nav";
import { UserMenu } from "./_components/user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, role, capabilities } = await getCurrentRole();
  const user = session.user;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar sm:flex sm:flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Brand className="text-sm" />
        </div>
        <SidebarNav capabilities={capabilities} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-2 sm:hidden">
            <MobileNav capabilities={capabilities} />
            <Brand className="text-sm" />
          </div>
          <span className="hidden sm:block" />
          <UserMenu
            name={user.name ?? user.email ?? "Użytkownik"}
            email={user.email ?? ""}
            role={role}
          />
        </header>

        <main className="flex-1 bg-muted/30 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
