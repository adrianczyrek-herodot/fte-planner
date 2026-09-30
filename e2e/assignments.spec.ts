import { expect, test, type Page } from "@playwright/test";

import { cleanupE2eData, createEmployee, createProject } from "./helpers/db";

// Pełny lipiec jako zakres dzienny — obsada ma teraz granulację dnia.
const FROM = "2026-07-01";
const TO = "2026-07-31";
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
  // Stanowisko pochodzi ze słownika; dopisujemy je na miejscu, żeby test nie
  // zależał od zawartości słownika (i żeby przejść ścieżkę „szybkie dodanie").
  await dlg.getByRole("button", { name: "Dodaj nowe stanowisko do słownika" }).click();
  await dlg.getByLabel("Nazwa nowego stanowiska").fill(position);
  await dlg.getByRole("button", { name: "Dodaj", exact: true }).click();
  await expect(dlg.getByRole("combobox")).toContainText(position);
  await dlg.getByLabel("Od (dzień)").fill(FROM);
  await dlg.getByLabel("Do (dzień)").fill(TO);
  await dlg.getByLabel("Wymagane FTE").fill("1");
  await dlg.getByRole("button", { name: "Dodaj rolę" }).click();
  await expect(dlg).toBeHidden();
}

async function assignLast(page: Page, fte: string) {
  await page.getByRole("button", { name: "Przypisz osobę" }).last().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("combobox").click();
  await page.getByRole("option", { name: employeeName }).click();
  await dlg.getByLabel("Od (dzień)").fill(FROM);
  await dlg.getByLabel("Do (dzień)").fill(TO);
  await dlg.getByLabel("FTE", { exact: true }).fill(fte);
  await dlg.getByRole("button", { name: "Przypisz", exact: true }).click();
  await expect(dlg).toBeHidden();
}

test("definicja roli + przypisanie osoby → obsada widoczna", async ({ page }) => {
  await page.goto(`/app/projekty/${projectAId}`);
  await addRole(page, "Frontend");
  await assignLast(page, "0.7");

  // Osoba widnieje teraz w dwóch miejscach: w obsadzie roli i w zestawieniu
  // kosztów, więc celujemy wprost w sekcję zapotrzebowania na role.
  const obsada = page.locator('[data-section="staffing"]');
  await expect(obsada.getByText(employeeName)).toBeVisible();
  await expect(obsada.getByText("0.7 FTE")).toBeVisible();
});

test("2×0.7 na nakładających się rolach → konflikt widoczny na liście projektów", async ({
  page,
}) => {
  await page.goto(`/app/projekty/${projectAId}`);
  await addRole(page, "Backend");
  await assignLast(page, "0.7"); // ta sama osoba, ten sam okres → suma 1.4

  await page.goto("/app/projekty");
  const row = page.getByRole("row", { name: new RegExp(projectAName) });
  await expect(row.locator('[aria-label*="Konflikt FTE"]')).toBeVisible();
});
