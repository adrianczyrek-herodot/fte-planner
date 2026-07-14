import { expect, test } from "@playwright/test";

import { cleanupE2eData } from "./helpers/db";

test.afterAll(async () => {
  await cleanupE2eData();
});

test("dodanie projektu przenosi na stronę szczegółów", async ({ page }) => {
  const name = `E2E Projekt ${Date.now()}`;
  await page.goto("/app/projekty");
  await page.getByRole("button", { name: "Dodaj projekt" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nazwa", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Dodaj projekt" }).click();

  await expect(page).toHaveURL(/\/app\/projekty\/.+/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
});

test("walidacja: data zakończenia wcześniejsza niż rozpoczęcia → błąd, brak zapisu", async ({ page }) => {
  await page.goto("/app/projekty");
  await page.getByRole("button", { name: "Dodaj projekt" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nazwa", { exact: true }).fill(`E2E Daty ${Date.now()}`);
  await dialog.getByLabel("Data rozpoczęcia", { exact: true }).fill("2026-08-10");
  await dialog.getByLabel("Data zakończenia", { exact: true }).fill("2026-07-13");
  await dialog.getByRole("button", { name: "Dodaj projekt" }).click();

  await expect(
    dialog.getByText(/Data zakończenia nie może być wcześniejsza/)
  ).toBeVisible();
  // Dialog zostaje otwarty (nie przekierowało na szczegóły).
  await expect(page).toHaveURL(/\/app\/projekty$/);
});
