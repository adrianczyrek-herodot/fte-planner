import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { Client } from "pg";

// Seedujemy/sprzątamy bazę przez surowy SQL (sterownik pg), a NIE przez klienta
// Prisma — wygenerowany klient jest ESM (import.meta) i nie ładuje się w CJS-owym
// runtime Playwrighta. Konwencja: encje E2E mają "e2e"/"E2E" w mailu/nazwie.
export const ADMIN_EMAIL = "e2e-admin@example.test";
export const ADMIN_PASSWORD = "e2ePass123";

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await withClient((c) =>
    c.query(
      `INSERT INTO "User" (id, email, "firstName", "lastName", role, status, "passwordHash", "updatedAt")
       VALUES ('e2e_admin_id', $1, 'E2E', 'Admin', 'admin', 'approved', $2, now())
       ON CONFLICT (email) DO UPDATE
         SET "passwordHash" = EXCLUDED."passwordHash", role = 'admin', status = 'approved'`,
      [ADMIN_EMAIL, passwordHash]
    )
  );
}

export async function createEmployee(input: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  const id = randomUUID();
  await withClient((c) =>
    c.query(
      `INSERT INTO "User" (id, email, "firstName", "lastName", role, status, "updatedAt")
       VALUES ($1, $2, $3, $4, 'user', 'approved', now())`,
      [id, input.email, input.firstName, input.lastName]
    )
  );
  return { id, ...input };
}

export async function createProject(name: string) {
  const id = randomUUID();
  await withClient((c) =>
    c.query(
      `INSERT INTO "Project" (id, name, "updatedAt") VALUES ($1, $2, now())`,
      [id, name]
    )
  );
  return { id, name };
}

export async function cleanupE2eData() {
  await withClient(async (c) => {
    await c.query(`DELETE FROM "Project" WHERE name LIKE '%E2E%'`);
    await c.query(`DELETE FROM "User" WHERE email LIKE 'e2e-%' AND email <> $1`, [
      ADMIN_EMAIL,
    ]);
  });
}
