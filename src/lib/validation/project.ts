import * as z from "zod";

export const ProjectSchema = z.object({
  name: z.string().trim().min(1, { error: "Nazwa jest wymagana." }),
  description: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export type ProjectFormState =
  | {
      success?: boolean;
      errors?: {
        name?: string[];
      };
      message?: string;
    }
  | undefined;
