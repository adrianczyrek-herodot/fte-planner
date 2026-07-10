import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { UserStatus } from "@/generated/prisma/enums";

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid-credentials";
}

export class PendingApprovalError extends CredentialsSignin {
  code = "pending-approval";
}

export class AccountInactiveError extends CredentialsSignin {
  code = "account-inactive";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          throw new InvalidCredentialsError();
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.passwordHash) {
          throw new InvalidCredentialsError();
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);

        if (!passwordValid) {
          throw new InvalidCredentialsError();
        }

        if (user.status === UserStatus.inactive) {
          throw new AccountInactiveError();
        }

        if (user.status !== UserStatus.approved) {
          throw new PendingApprovalError();
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      session.user.status = token.status;
      return session;
    },
  },
});
