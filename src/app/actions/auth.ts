"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";

import { auth, signIn, signOut, PendingApprovalError } from "@/auth";
import { prisma } from "@/lib/prisma";
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
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { firstName, lastName, email, password } = validatedFields.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
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
    return { errors: validatedFields.error.flatten().fieldErrors };
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
    if (error instanceof AuthError) {
      return { message: "Nieprawidłowy e-mail lub hasło." };
    }
    throw error;
  }

  redirect("/app");
}

export async function logout() {
  await signOut({ redirect: false });
  redirect("/login");
}

export async function requireApprovedUser() {
  const session = await auth();
  if (!session?.user || session.user.status !== "approved") {
    redirect("/login");
  }
  return session;
}
