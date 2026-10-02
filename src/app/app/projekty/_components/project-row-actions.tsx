"use client";

import { Pencil, Trash2 } from "lucide-react";

import { deleteProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ProjectLinkKey } from "@/lib/validation/project";
import { ProjectFormDialog } from "./project-form-dialog";

type Project = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
} & Record<ProjectLinkKey, string | null>;

export function ProjectRowActions({ project }: { project: Project }) {
  return (
    <div className="flex items-center gap-1">
      <ProjectFormDialog
        mode="edit"
        project={project}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Edytuj projekt">
            <Pencil />
          </Button>
        }
      />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Usuń projekt">
            <Trash2 className="text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć projekt?</AlertDialogTitle>
            <AlertDialogDescription>
              Projekt „{project.name}” zostanie trwale usunięty wraz z przydziałami
              i załącznikami. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <form action={deleteProject}>
              <input type="hidden" name="id" value={project.id} />
              <AlertDialogAction type="submit" variant="destructive">
                Usuń
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
