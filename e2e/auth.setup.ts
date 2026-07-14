import { test as setup, expect } from "@playwright/test";

import { ADMIN_EMAIL, ADMIN_PASSWORD, seedAdmin } from "./helpers/db";

const authFile = "e2e/.auth/admin.json";

// Seeduje konto admina ze znanym hasłem, loguje się przez UI i zapisuje sesję,
// której używają pozostałe testy (żeby nie logować się w każdym z osobna).
setup("authenticate", async ({ page }) => {
  await seedAdmin();

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(ADMIN_EMAIL);
  await page.getByLabel("Hasło", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Zaloguj się" }).click();

  await page.waitForURL("**/app");
  await expect(page.getByRole("link", { name: "Pracownicy" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
