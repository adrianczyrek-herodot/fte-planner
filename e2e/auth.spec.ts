import { expect, test } from "@playwright/test";

// Testy niezalogowanego — nadpisujemy zapisaną sesję pustą.
test.describe("Niezalogowany", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("wejście na /app przekierowuje na /login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("błędne logowanie pokazuje komunikat", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill("ktos@nieistnieje.test");
    await page.getByLabel("Hasło", { exact: true }).fill("zlehaslo1");
    await page.getByRole("button", { name: "Zaloguj się" }).click();
    await expect(page.getByText("Nieprawidłowy e-mail lub hasło.")).toBeVisible();
  });
});
