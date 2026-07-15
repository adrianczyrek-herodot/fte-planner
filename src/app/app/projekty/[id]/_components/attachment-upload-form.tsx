"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";

import { uploadAttachment } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useActionEffect } from "@/lib/hooks/use-action-effect";

export function AttachmentUploadForm({ projectId }: { projectId: string }) {
  const action = uploadAttachment.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, undefined);

  // Wyczyść input pliku po udanym uploadzie przez remount formularza.
  const [formKey, setFormKey] = useState(0);
  useActionEffect(state, (s) => {
    if (!s?.message) setFormKey((key) => key + 1);
  });

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input type="file" name="file" required />
        <Button type="submit" disabled={pending}>
          <Upload />
          {pending ? "Przesyłanie…" : "Dodaj załącznik"}
        </Button>
      </div>
      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
