import { expect, test, type Page } from "@playwright/test";

import { cleanupE2eData, createEmployee, createProject } from "./helpers/db";

const M = "2026-07";
let employeeName = "";
let projectAId = "";
let projectAName = "";

test.beforeAll(async () => {
  const suffix = Date.now();
  const emp = await createEmployee({
    email: `e2e-assignee-${suffix}@x.test`,
    firstName: "Ewa",
    lastName: `E2EPrzydzial${suffix}`,
  });
  employeeName = `Ewa ${emp.lastName}`;
  projectAName = `E2E Staffing A ${suffix}`;
  const a = await createProject(projectAName);
  projectAId = a.id;
});

test.afterAll(async () => {
  await cleanupE2eData();
});

async function addRole(page: Page, position: string) {
  await page.getByRole("button", { name: "Dodaj rolę" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Stanowisko / rola").fill(position);
  await dlg.getByLabel("Od (miesiąc)").fill(M);
  await dlg.getByLabel("Do (miesiąc)").fill(M);
  await dlg.getByLabel("Wymagane FTE").fill("1");
  await dlg.getByRole("button", { name: "Dodaj rolę" }).click();
  await expect(dlg).toBeHidden();
}

async function assignLast(page: Page, fte: string) {
  await page.getByRole("button", { name: "Przypisz osobę" }).last().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("combobox").click();
  await page.getByRole("option", { name: employeeName }).click();
  await dlg.getByLabel("Od (miesiąc)").fill(M);
  await dlg.getByLabel("Do (miesiąc)").fill(M);
  await dlg.getByLabel("FTE", { exact: true }).fill(fte);
  await dlg.getByRole("button", { name: "Przypisz", exact: true }).click();
  await expect(dlg).toBeHidden();
}

test("definicja roli + przypisanie osoby → obsada widoczna", async ({ page }) => {
  await page.goto(`/app/projekty/${projectAId}`);
  await addRole(page, "Frontend");
  await assignLast(page, "0.7");

  await expect(page.getByText(employeeName)).toBeVisible();
  await expect(page.getByText("0.7 FTE")).toBeVisible();
});

test("2×0.7 na nakładających się rolach → konflikt widoczny na liście projektów", async ({
  page,
}) => {
  await page.goto(`/app/projekty/${projectAId}`);
  await addRole(page, "Backend");
  await assignLast(page, "0.7"); // ta sama osoba, ten sam miesiąc → suma 1.4

  await page.goto("/app/projekty");
  const row = page.getByRole("row", { name: new RegExp(projectAName) });
  await expect(row.locator('[aria-label*="Konflikt FTE"]')).toBeVisible();
});
