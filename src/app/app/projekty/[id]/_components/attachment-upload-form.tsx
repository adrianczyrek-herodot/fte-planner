"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";

import { uploadAttachment } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AttachmentUploadForm({ projectId }: { projectId: string }) {
  const action = uploadAttachment.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, undefined);

  // Clear the file input after a successful upload by remounting the form,
  // using the same render-time state-comparison pattern as the dialogs
  // (avoids the set-state-in-effect lint issue with useEffect).
  const [formKey, setFormKey] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (!state?.message) {
      setFormKey((key) => key + 1);
    }
  }

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
