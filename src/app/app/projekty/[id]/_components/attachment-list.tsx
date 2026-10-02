import { FileText } from "lucide-react";

import { deleteAttachment } from "@/app/actions/projects";
import { ConfirmDelete } from "@/components/confirm-delete";

// Tylko formaty, które serwer pozwala wyświetlić w przeglądarce (patrz
// /api/attachments). SVG idzie jako pobranie, więc podgląd by się nie wczytał.
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

function isImage(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return !!ext && IMAGE_EXTENSIONS.includes(ext);
}

type Attachment = {
  id: string;
  fileUrl: string;
  fileName: string;
};

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Brak załączników. Dodaj pierwszy plik powyżej.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {attachments.map((attachment) => {
        // The Blob store is private; attachment.fileUrl holds the blob's
        // pathname, served through our own authenticated route.
        const viewUrl = `/api/attachments?pathname=${encodeURIComponent(attachment.fileUrl)}`;
        return (
          <li key={attachment.id} className="rounded-lg border p-2">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 text-center"
            >
              {isImage(attachment.fileName) ? (
                // eslint-disable-next-line @next/next/no-img-element -- served via our own route, not optimizable by next/image
                <img
                  src={viewUrl}
                  alt={attachment.fileName}
                  className="h-24 w-full rounded-md object-cover"
                />
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded-md bg-muted">
                  <FileText className="size-8 text-muted-foreground" />
                </div>
              )}
              <span className="line-clamp-2 w-full text-xs break-words text-muted-foreground">
                {attachment.fileName}
              </span>
            </a>
            <div className="mt-1 flex justify-center">
              <ConfirmDelete
                label={`Usuń załącznik ${attachment.fileName}`}
                title="Usunąć załącznik?"
                description={`Plik „${attachment.fileName}” zostanie trwale usunięty. Tej operacji nie można cofnąć.`}
                action={deleteAttachment}
                fields={{ id: attachment.id }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
