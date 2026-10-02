"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import * as z from "zod";

import { signIn, signOut, PendingApprovalError, AccountInactiveError } from "@/auth";
import { prisma } from "@/lib/prisma";
import { emailLookup } from "@/lib/validation/email";
import {
  LoginFormSchema,
  LoginFormState,
  SignupFormSchema,
  SignupFormState,
} from "@/lib/validation/auth";

export async function signup(
  _state: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const validatedFields = SignupFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { firstName, lastName, email, password } = validatedFields.data;

  const existingUser = await prisma.user.findFirst({ where: emailLookup(email) });
  if (existingUser) {
    return { message: "Konto z tym adresem e-mail już istnieje." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: "user",
      status: "pending",
    },
  });

  redirect("/pending");
}

export async function login(
  _state: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: z.flattenError(validatedFields.error).fieldErrors };
  }

  const { email, password } = validatedFields.data;

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof PendingApprovalError) {
      return {
        message: "Twoje konto czeka na zatwierdzenie przez administratora.",
      };
    }
    if (error instanceof AccountInactiveError) {
      return {
        message: "Twoje konto zostało dezaktywowane. Skontaktuj się z administratorem.",
      };
    }
    if (error instanceof AuthError) {
      return { message: "Nieprawidłowy e-mail lub hasło." };
    }
    throw error;
  }

  redirect(safeNextPath(formData.get("next")));
}

/**
 * Dokąd wrócić po zalogowaniu. Przyjmujemy wyłącznie ścieżki wewnątrz aplikacji
 * — inaczej parametr w linku do logowania pozwalałby przekierować kogoś na
 * obcą stronę zaraz po wpisaniu hasła.
 */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/app";
  if (!value.startsWith("/app") || value.startsWith("//") || value.includes("\\")) {
    return "/app";
  }
  return value;
}

export async function logout() {
  await signOut({ redirect: false });
  redirect("/login");
}
