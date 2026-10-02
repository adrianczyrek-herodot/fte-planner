"use server";

import bcrypt from "bcryptjs";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { emailLookup } from "@/lib/validation/email";
import { consumePasswordResetToken, createPasswordResetToken } from "@/lib/tokens";
import { sendPasswordSetupEmail } from "@/lib/mail";
import {
  RequestResetFormState,
  RequestResetSchema,
  SetPasswordFormState,
  SetPasswordSchema,
} from "@/lib/validation/password";

export async function setPassword(
  _state: SetPasswordFormState,
  formData: FormData
): Promise<SetPasswordFormState> {
  const validatedFields = SetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { token, password } = validatedFields.data;

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return {
      message:
        "Link jest nieprawidłowy lub wygasł. Poproś administratora o nowe zaproszenie lub zresetuj hasło ponownie.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Zaproszone konto jest aktywne od chwili dodania, więc wystarczy hasło.
  // Statusu nie ruszamy: o aktywacji decyduje wyłącznie administrator.
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}

export async function requestPasswordReset(
  _state: RequestResetFormState,
  formData: FormData
): Promise<RequestResetFormState> {
  const validatedFields = RequestResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { email } = validatedFields.data;

  const user = await prisma.user.findFirst({ where: emailLookup(email) });

  // Reset wysyłamy tylko dla aktywnych kont, ale odpowiedź jest zawsze taka
  // sama — nie zdradzamy, czy dany e-mail istnieje w systemie.
  if (user && user.status === "approved") {
    const token = await createPasswordResetToken(user.id, "reset");
    await sendPasswordSetupEmail(user.email, token, "reset");
  }

  return { success: true };
}
