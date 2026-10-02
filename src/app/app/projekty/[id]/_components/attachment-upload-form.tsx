"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";

import { uploadAttachment } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useActionEffect } from "@/lib/hooks/use-action-effect";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_LABEL } from "@/lib/validation/project";

export function AttachmentUploadForm({ projectId }: { projectId: string }) {
  const action = uploadAttachment.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, undefined);

  // Wyczyść input pliku po udanym uploadzie przez remount formularza.
  const [formKey, setFormKey] = useState(0);
  useActionEffect(state, (s) => {
    if (!s?.message) setFormKey((key) => key + 1);
  });

  // Za duży plik zatrzymujemy w przeglądarce: serwer odrzuciłby całe żądanie,
  // zanim akcja zdążyłaby zwrócić czytelny komunikat.
  const [tooLarge, setTooLarge] = useState(false);
  const message = tooLarge
    ? `Plik jest zbyt duży (maksymalnie ${MAX_ATTACHMENT_LABEL}).`
    : state?.message;

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          name="file"
          required
          onChange={(e) =>
            setTooLarge((e.target.files?.[0]?.size ?? 0) > MAX_ATTACHMENT_BYTES)
          }
        />
        <Button type="submit" disabled={pending || tooLarge}>
          <Upload />
          {pending ? "Przesyłanie…" : "Dodaj załącznik"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Maksymalny rozmiar pliku: {MAX_ATTACHMENT_LABEL}.
      </p>
      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
