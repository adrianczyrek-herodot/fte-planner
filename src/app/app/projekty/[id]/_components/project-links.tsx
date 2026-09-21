import { ExternalLink } from "lucide-react";

import { PROJECT_LINK_FIELDS, type ProjectLinkKey } from "@/lib/validation/project";

type Links = Partial<Record<ProjectLinkKey, string | null>>;

/**
 * Linki do zasobów projektu prowadzonych poza aplikacją. Pokazujemy tylko te
 * wypełnione — puste pola nie zajmują miejsca na widoku.
 */
export function ProjectLinks({ links }: { links: Links }) {
  const filled = PROJECT_LINK_FIELDS.filter((f) => links[f.key]);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Linki</h2>
      {filled.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Brak linków. Dodaj je w edycji projektu.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filled.map((field) => (
            <a
              key={field.key}
              href={links[field.key]!}
              target="_blank"
              rel="noopener noreferrer"
              title={links[field.key]!}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ExternalLink className="size-3.5 text-muted-foreground" />
              {field.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
