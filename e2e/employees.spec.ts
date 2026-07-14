import { expect, test } from "@playwright/test";

import { cleanupE2eData } from "./helpers/db";

test.afterAll(async () => {
  await cleanupE2eData();
});

async function addEmployee(
  page: import("@playwright/test").Page,
  { email, firstName, lastName }: { email: string; firstName: string; lastName: string }
) {
  await page.goto("/app/pracownicy");
  await page.getByRole("button", { name: "Dodaj pracownika" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("E-mail", { exact: true }).fill(email);
  await dialog.getByLabel("Imię", { exact: true }).fill(firstName);
  await dialog.getByLabel("Nazwisko", { exact: true }).fill(lastName);
  await dialog.getByLabel("Stanowisko", { exact: true }).fill("Tester");
  await dialog.getByRole("button", { name: "Dodaj pracownika" }).click();
  await expect(dialog).toBeHidden();
}

test("dodanie pracownika: dialog zamyka się, wiersz pojawia się bez reloadu", async ({ page }) => {
  const suffix = Date.now();
  const lastName = `E2Eowski${suffix}`;
  await addEmployee(page, {
    email: `e2e-emp-${suffix}@x.test`,
    firstName: "Jan",
    lastName,
  });
  await expect(page.getByRole("cell", { name: `Jan ${lastName}` })).toBeVisible();
});

test("dezaktywacja pracownika przez dialog potwierdzenia zmienia badge", async ({ page }) => {
  const suffix = Date.now();
  const lastName = `E2EDeakt${suffix}`;
  await addEmployee(page, {
    email: `e2e-deakt-${suffix}@x.test`,
    firstName: "Anna",
    lastName,
  });

  const row = page.getByRole("row", { name: new RegExp(`Anna ${lastName}`) });
  await expect(row.getByText("Aktywny")).toBeVisible();

  await row.getByRole("button", { name: "Dezaktywuj pracownika" }).click();
  await page.getByRole("button", { name: "Dezaktywuj", exact: true }).click();

  await expect(row.getByText("Nieaktywny")).toBeVisible();
});
