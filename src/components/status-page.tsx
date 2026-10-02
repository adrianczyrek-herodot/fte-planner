import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Wspólny układ stron 404 i błędów: ikona, tytuł, opis i akcje. */
export function StatusPage({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
