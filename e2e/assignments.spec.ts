import { expect, test, type Page } from "@playwright/test";

import { cleanupE2eData, createEmployee, createProject } from "./helpers/db";

const MONTH = "2026-07";
let employeeName = "";
let projectAId = "";
let projectBId = "";

test.beforeAll(async () => {
  const suffix = Date.now();
  const emp = await createEmployee({
    email: `e2e-assignee-${suffix}@x.test`,
    firstName: "Ewa",
    lastName: `E2EPrzydzial${suffix}`,
  });
  employeeName = `Ewa ${emp.lastName}`;
  const a = await createProject(`E2E Przydzial A ${suffix}`);
  const b = await createProject(`E2E Przydzial B ${suffix}`);
  projectAId = a.id;
  projectBId = b.id;
});

test.afterAll(async () => {
  await cleanupE2eData();
});

async function assign(page: Page, projectId: string, fte: string) {
  await page.goto(`/app/projekty/${projectId}`);
  // Radix Select (weryfikuje, że wybór pracownika trafia do FormData jako userId)
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: employeeName }).click();
  await page.getByLabel("Miesiąc", { exact: true }).fill(MONTH);
  await page.getByLabel("FTE", { exact: true }).fill(fte);
  await page.getByRole("button", { name: "Przydziel" }).click();
}

test("dodanie przydziału przez formularz — wiersz z badge OK", async ({ page }) => {
  await assign(page, projectAId, "0.7");
  const row = page.getByRole("row", { name: new RegExp(employeeName) });
  await expect(row).toBeVisible();
  await expect(row.getByText("OK")).toBeVisible();
});

test("2×0.7 dla tego samego pracownika i miesiąca → wyraźny konflikt", async ({ page }) => {
  await assign(page, projectBId, "0.7");
  const row = page.getByRole("row", { name: new RegExp(employeeName) });
  await expect(row.getByText("Konflikt")).toBeVisible();
});
