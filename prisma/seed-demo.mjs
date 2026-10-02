/**
 * Dane demonstracyjne dla FTE Plannera.
 *
 *   node prisma/seed-demo.mjs
 *
 * Skrypt jest idempotentny — można go odpalić ponownie przed pokazem, żeby
 * przywrócić czysty, spójny stan. Role i przydziały są odtwarzane od zera,
 * konta użytkowników są upsertowane po adresie e-mail.
 *
 * Świadomie używamy surowego SQL przez sterownik `pg`, a nie klienta Prismy —
 * wygenerowany klient jest ESM-owym TypeScriptem i nie ładuje się w zwykłym
 * skrypcie node. Ta sama konwencja co w `e2e/helpers/db.ts`.
 */
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ quiet: true });

/**
 * Miesiące "YYYY-MM" pokryte zakresem [start, end] włącznie.
 * Uwaga: źródłem prawdy dla tej reguły w aplikacji jest `src/lib/staffing.ts`
 * (pokryte testami jednostkowymi). Tutaj powtarzamy ją w minimalnej formie,
 * bo skrypt seedujący nie ładuje TypeScriptu z aliasami ścieżek.
 */
function monthsBetween(start, end) {
  const toIndex = (m) => {
    const [y, mo] = m.split("-").map(Number);
    return y * 12 + (mo - 1);
  };
  const s = toIndex(start);
  const e = toIndex(end);
  if (e < s) return [start];
  const out = [];
  for (let i = s; i <= e; i++) {
    out.push(`${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Przydział jest w konflikcie, gdy w dowolnym pokrytym miesiącu suma FTE > 1.0. */
function computeAssignmentConflicts(assignments) {
  // Sumujemy na setnych, aby uniknąć błędów zmiennoprzecinkowych (jak w src/lib/fte.ts).
  const perMonth = new Map();
  for (const a of assignments) {
    for (const m of monthsBetween(a.startMonth, a.endMonth)) {
      perMonth.set(m, (perMonth.get(m) ?? 0) + Math.round(a.fte * 100));
    }
  }
  return new Map(
    assignments.map((a) => [
      a.id,
      monthsBetween(a.startMonth, a.endMonth).some(
        (m) => (perMonth.get(m) ?? 0) > 100
      ),
    ])
  );
}

/**
 * Dane demo opisujemy w całych miesiącach ("YYYY-MM"), a baza trzyma okresy w dniach.
 * Miesiąc początkowy to jego pierwszy dzień, końcowy — ostatni (jak w migracji
 * `przydzialy_dzienne`), więc reguła konfliktów liczona po miesiącach pozostaje trafna.
 */
const MONTH_START_SQL = (p) => `to_date(${p} || '-01', 'YYYY-MM-DD')`;
const MONTH_END_SQL = (p) =>
  `(to_date(${p} || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 day')::date`;

const DEMO_PASSWORD = "Demo1234";

// --- Obsada: kto, gdzie, na jakim FTE ---------------------------------------
// Zakresy są dobrane tak, aby pokaz obejmował wszystkie stany interfejsu:
// niedobór obsady, rolę obsadzoną w 100%, rolę bez nikogo, projekt po terminie
// oraz konflikt FTE (Michał Nowak: 0.7 + 0.5 = 1.2 w miesiącach 08–10).
const EMPLOYEES = [
  {
    email: "admin@demo.pl",
    firstName: "Anna",
    lastName: "Kowalska",
    position: "Head of Delivery",
    skills: ["Zarządzanie", "Scrum"],
    role: "admin",
    status: "approved",
    password: DEMO_PASSWORD,
  },
  {
    email: "manager@demo.pl",
    firstName: "Piotr",
    lastName: "Zieliński",
    position: "Project Manager",
    skills: ["Zarządzanie projektami", "Jira", "Scrum"],
    role: "manager",
    status: "approved",
    password: DEMO_PASSWORD,
  },
  {
    email: "kadry@demo.pl",
    firstName: "Barbara",
    lastName: "Adamska",
    position: "Specjalista kadr",
    skills: ["Excel"],
    role: "finance",
    status: "approved",
    password: DEMO_PASSWORD,
  },
  {
    email: "m.nowak@test.com",
    firstName: "Michał",
    lastName: "Nowak",
    position: "Frontend Developer",
    skills: ["React", "TypeScript", "Figma"],
    role: "user",
    status: "approved",
    password: DEMO_PASSWORD,
  },
  {
    email: "k.wasiak@test.com",
    firstName: "Krystian",
    lastName: "Wasiak",
    position: "IT Support",
    skills: ["SQL", "Docker", "AWS"],
    role: "user",
    status: "approved",
    password: DEMO_PASSWORD,
  },
  {
    email: "test2@gmail.com",
    firstName: "Magdalena",
    lastName: "Lis",
    position: "Backend Developer",
    skills: ["Node.js", "PostgreSQL", "Prisma"],
    role: "user",
    status: "approved",
    password: DEMO_PASSWORD,
  },
  {
    email: "adriantest@mail.com",
    firstName: "Adrian",
    lastName: "Tester",
    position: "QA Engineer",
    skills: ["Playwright", "TypeScript", "Testowanie"],
    role: "user",
    status: "approved",
    // Bez hasła — konto zachowuje to, które już ma.
  },
  {
    email: "e.sikora@demo.pl",
    firstName: "Ewa",
    lastName: "Sikora",
    position: "Analityk biznesowy",
    skills: ["Analiza biznesowa", "SQL"],
    role: "user",
    status: "approved",
    password: DEMO_PASSWORD,
  },
  {
    email: "t.bak@demo.pl",
    firstName: "Tomasz",
    lastName: "Bąk",
    position: "DevOps Engineer",
    skills: ["AWS", "Terraform", "Docker"],
    role: "user",
    status: "approved",
    password: DEMO_PASSWORD,
  },
  {
    // Bez hasła — pokazuje pracownika, który jeszcze nie odebrał zaproszenia.
    email: "k.wojcik@demo.pl",
    firstName: "Katarzyna",
    lastName: "Wójcik",
    position: "UX Designer",
    skills: ["Figma", "Badania UX"],
    role: "user",
    status: "approved",
  },
  {
    // Konto oczekujące na akceptację — pokazuje ekran /pending po zalogowaniu.
    email: "oczekujacy@test.com",
    firstName: "Anna",
    lastName: "Oczekująca",
    position: null,
    skills: [],
    role: "user",
    status: "pending",
    password: DEMO_PASSWORD,
  },
];

// Stawki godzinowe (PLN). Stanowiskowe są bazą, stawka pracownika ma
// pierwszeństwo. Michał ma dwie wartości, żeby pokazać historię stawek.
const POSITION_RATES = [
  { position: "Frontend Developer", hourlyRate: 120, validFrom: "2026-01-01" },
  { position: "Backend Developer", hourlyRate: 125, validFrom: "2026-01-01" },
  { position: "Analityk biznesowy", hourlyRate: 110, validFrom: "2026-01-01" },
  { position: "DevOps Engineer", hourlyRate: 140, validFrom: "2026-01-01" },
  { position: "UX Designer", hourlyRate: 115, validFrom: "2026-01-01" },
  { position: "IT Support", hourlyRate: 85, validFrom: "2026-01-01" },
];

const EMPLOYEE_RATES = [
  { email: "m.nowak@test.com", hourlyRate: 150, validFrom: "2026-01-01" },
  { email: "m.nowak@test.com", hourlyRate: 180, validFrom: "2026-08-01" },
  { email: "test2@gmail.com", hourlyRate: 135, validFrom: "2026-01-01" },
];

const PROJECTS = [
  {
    name: "Portal klienta B2B",
    description:
      "Samoobsługowy portal dla klientów korporacyjnych: zamówienia, faktury, zgłoszenia serwisowe.",
    startDate: "2026-07-01",
    endDate: "2026-11-03",
    budget: 150000,
    links: {
      projectCardUrl: "https://jira.example.com/projects/B2B",
      riskCardUrl: "https://confluence.example.com/display/B2B/Rejestr+ryzyk",
      confluenceUrl: "https://confluence.example.com/display/B2B",
      miroUrl: "https://miro.com/app/board/portal-b2b",
      domainUrl: "https://portal.example.com",
    },
    costItems: [
      { name: "Licencje Figma", category: "software", amount: 4800 },
      { name: "Środowisko testowe", category: "tools", amount: 12000 },
    ],
    roles: [
      {
        position: "Frontend Developer",
        startMonth: "2026-07",
        endMonth: "2026-10",
        requiredFte: 1,
        requiredPeople: 2, // niedobór głów: zaplanowani dwaj, obsadzony jeden
        // Niedobór 0.3 FTE — widoczny badge „Niedobór”.
        assignments: [
          { email: "m.nowak@test.com", startMonth: "2026-07", endMonth: "2026-10", fte: 0.7 },
        ],
      },
      {
        position: "Backend Developer",
        startMonth: "2026-07",
        endMonth: "2026-10",
        requiredFte: 1,
        requiredPeople: 1,
        assignments: [
          { email: "test2@gmail.com", startMonth: "2026-07", endMonth: "2026-10", fte: 1 },
        ],
      },
      {
        position: "Analityk biznesowy",
        startMonth: "2026-07",
        endMonth: "2026-08",
        requiredFte: 0.5,
        requiredPeople: 1,
        assignments: [
          { email: "e.sikora@demo.pl", startMonth: "2026-07", endMonth: "2026-08", fte: 0.5 },
        ],
      },
    ],
  },
  {
    name: "Tisa",
    description:
      "Modernizacja wewnętrznego systemu Tisa — nowy interfejs i integracja z hurtownią danych.",
    startDate: "2026-08-02",
    endDate: "2026-10-01",
    budget: 240000,
    roles: [
      {
        position: "Frontend Developer",
        startMonth: "2026-08",
        endMonth: "2026-10",
        requiredFte: 0.5,
        // Razem z Portalem daje Michałowi 1.2 FTE → konflikt obłożenia.
        assignments: [
          { email: "m.nowak@test.com", startMonth: "2026-08", endMonth: "2026-10", fte: 0.5 },
        ],
      },
      {
        position: "UX Designer",
        startMonth: "2026-08",
        endMonth: "2026-09",
        requiredFte: 0.5,
        assignments: [
          { email: "k.wojcik@demo.pl", startMonth: "2026-08", endMonth: "2026-09", fte: 0.5 },
        ],
      },
      {
        position: "IT Support",
        startMonth: "2026-08",
        endMonth: "2026-10",
        requiredFte: 0.5,
        assignments: [
          { email: "k.wasiak@test.com", startMonth: "2026-08", endMonth: "2026-10", fte: 0.5 },
        ],
      },
    ],
  },
  {
    name: "Migracja do chmury",
    description:
      "Przeniesienie środowisk produkcyjnych do AWS wraz z automatyzacją wdrożeń.",
    startDate: "2026-09-01",
    endDate: "2026-12-18",
    budget: 420000,
    roles: [
      {
        position: "DevOps Engineer",
        startMonth: "2026-09",
        endMonth: "2026-12",
        requiredFte: 1,
        requiredPeople: 1,
        assignments: [
          { email: "t.bak@demo.pl", startMonth: "2026-09", endMonth: "2026-12", fte: 1 },
        ],
      },
      {
        // Rola bez nikogo — pokazuje pustą obsadę i akcję „Przypisz osobę”.
        position: "Analityk biznesowy",
        startMonth: "2026-09",
        endMonth: "2026-10",
        requiredFte: 0.5,
        assignments: [],
      },
    ],
  },
  {
    // Projekt zakończony w przeszłości — pokazuje badge „Po terminie”.
    name: "Rebranding aplikacji mobilnej",
    description: "Nowa identyfikacja wizualna i przeprojektowanie ścieżek onboardingu.",
    startDate: "2026-04-01",
    endDate: "2026-07-31",
    budget: 90000,
    roles: [
      {
        position: "UX Designer",
        startMonth: "2026-04",
        endMonth: "2026-07",
        requiredFte: 1,
        requiredPeople: 1, // nadmiar głów: obsadzone dwie osoby
        // Świadomie 1.5 FTE przy wymaganym 1.0 — pokazuje stan „Nadmiar" na
        // wskaźniku pokrycia roli.
        assignments: [
          { email: "k.wojcik@demo.pl", startMonth: "2026-04", endMonth: "2026-07", fte: 1 },
          { email: "admin@demo.pl", startMonth: "2026-04", endMonth: "2026-07", fte: 0.5 },
        ],
      },
    ],
  },
];

// Skrypt kasuje projekty i zakłada konta (także administratora) ze znanym
// hasłem — na współdzielonej bazie byłby furtką. Domyślnie działa wyłącznie
// na bazie lokalnej; świadome użycie gdzie indziej wymaga ALLOW_DEMO_SEED=1.
const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();
if (!["localhost", "127.0.0.1", "::1"].includes(dbHost) && process.env.ALLOW_DEMO_SEED !== "1") {
  console.error(
    `⛔ Odmowa: DATABASE_URL wskazuje na „${dbHost || "?"}", a nie na bazę lokalną.\n` +
      "   Dane demo zawierają konto administratora z hasłem Demo1234.\n" +
      "   Jeśli na pewno chcesz je wgrać, uruchom z ALLOW_DEMO_SEED=1."
  );
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");

  // 1. Sprzątanie danych wygenerowanych przez testy E2E. Konto e2e-admin jest
  //    zasiewane automatycznie przy każdym `npm run test:e2e`, więc usunięcie
  //    go tutaj niczego nie psuje.
  await client.query(`DELETE FROM "Project" WHERE name LIKE '%E2E%'`);
  await client.query(`DELETE FROM "User" WHERE email LIKE 'e2e-%'`);

  // 2. Słowniki. Stanowiska i kompetencje są teraz relacjami, więc muszą
  //    istnieć, zanim przypniemy do nich pracowników i role w projektach.
  const positionNames = [
    ...new Set([
      ...EMPLOYEES.map((e) => e.position).filter(Boolean),
      ...PROJECTS.flatMap((p) => p.roles.map((r) => r.position)),
    ]),
  ];
  const skillNames = [...new Set(EMPLOYEES.flatMap((e) => e.skills ?? []))];

  const positionIdByName = new Map();
  for (const name of positionNames) {
    const { rows } = await client.query(
      `INSERT INTO "Position" (id, name, "updatedAt")
       VALUES (gen_random_uuid()::text, $1, now())
       ON CONFLICT (name) DO UPDATE SET "updatedAt" = now()
       RETURNING id`,
      [name]
    );
    positionIdByName.set(name, rows[0].id);
  }

  const skillIdByName = new Map();
  for (const name of skillNames) {
    const { rows } = await client.query(
      `INSERT INTO "Skill" (id, name, "updatedAt")
       VALUES (gen_random_uuid()::text, $1, now())
       ON CONFLICT (name) DO UPDATE SET "updatedAt" = now()
       RETURNING id`,
      [name]
    );
    skillIdByName.set(name, rows[0].id);
  }

  // 3. Pracownicy.
  const userIdByEmail = new Map();
  for (const e of EMPLOYEES) {
    const passwordHash = e.password ? await bcrypt.hash(e.password, 12) : null;
    const { rows } = await client.query(
      `INSERT INTO "User"
         (id, email, "firstName", "lastName", "positionId", role, status,
          "passwordHash", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::"Role",
               $6::"UserStatus", $7, now())
       ON CONFLICT (email) DO UPDATE SET
         "firstName"    = EXCLUDED."firstName",
         "lastName"     = EXCLUDED."lastName",
         "positionId"   = EXCLUDED."positionId",
         role           = EXCLUDED.role,
         status         = EXCLUDED.status,
         -- Nie nadpisuj istniejącego hasła, gdy skrypt go nie podaje.
         "passwordHash" = COALESCE(EXCLUDED."passwordHash", "User"."passwordHash"),
         "updatedAt"    = now()
       RETURNING id`,
      [
        e.email,
        e.firstName,
        e.lastName,
        e.position ? positionIdByName.get(e.position) : null,
        e.role,
        e.status,
        passwordHash,
      ]
    );
    const userId = rows[0].id;
    userIdByEmail.set(e.email, userId);

    // Kompetencje: nadpisujemy cały zestaw, żeby seed był powtarzalny.
    await client.query(`DELETE FROM "_SkillToUser" WHERE "B" = $1`, [userId]);
    for (const skill of e.skills ?? []) {
      await client.query(
        `INSERT INTO "_SkillToUser" ("A", "B") VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [skillIdByName.get(skill), userId]
      );
    }
  }

  // 4. Projekty, role i obsada — odtwarzane od zera, by seed był powtarzalny.
  //    Kasacja projektu kaskadowo usuwa jego role i przydziały.
  const demoNames = PROJECTS.map((p) => p.name);
  await client.query(`DELETE FROM "Project" WHERE name = ANY($1::text[])`, [demoNames]);
  await client.query(`DELETE FROM "Project" WHERE name = 'Test projektu'`);

  const createdAssignments = [];
  for (const p of PROJECTS) {
    const links = p.links ?? {};
    const { rows } = await client.query(
      `INSERT INTO "Project"
         (id, name, description, "startDate", "endDate", budget,
          "projectCardUrl", "riskCardUrl", "confluenceUrl", "miroUrl", "domainUrl",
          "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3::timestamp, $4::timestamp, $5,
               $6, $7, $8, $9, $10, now())
       RETURNING id`,
      [
        p.name,
        p.description,
        p.startDate,
        p.endDate,
        p.budget,
        links.projectCardUrl ?? null,
        links.riskCardUrl ?? null,
        links.confluenceUrl ?? null,
        links.miroUrl ?? null,
        links.domainUrl ?? null,
      ]
    );
    const projectId = rows[0].id;

    for (const item of p.costItems ?? []) {
      await client.query(
        `INSERT INTO "ProjectCostItem" (id, "projectId", name, category, amount, "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3::"CostCategory", $4, now())`,
        [projectId, item.name, item.category, item.amount]
      );
    }

    for (const r of p.roles) {
      const { rows: roleRows } = await client.query(
        `INSERT INTO "ProjectRole"
           (id, "projectId", "positionId", "startDate", "endDate", "requiredFte",
            "requiredPeople", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, ${MONTH_START_SQL("$3")}, ${MONTH_END_SQL("$4")},
                 $5, $6, now())
         RETURNING id`,
        [
          projectId,
          positionIdByName.get(r.position),
          r.startMonth,
          r.endMonth,
          r.requiredFte,
          r.requiredPeople ?? null,
        ]
      );
      const roleId = roleRows[0].id;

      for (const a of r.assignments) {
        const userId = userIdByEmail.get(a.email);
        if (!userId) throw new Error(`Brak pracownika o e-mailu ${a.email}`);

        const { rows: aRows } = await client.query(
          `INSERT INTO "Assignment"
             (id, "userId", "projectRoleId", "startDate", "endDate", fte, "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2, ${MONTH_START_SQL("$3")}, ${MONTH_END_SQL("$4")},
                   $5, now())
           RETURNING id`,
          [userId, roleId, a.startMonth, a.endMonth, a.fte]
        );
        createdAssignments.push({
          id: aRows[0].id,
          userId,
          startMonth: a.startMonth,
          endMonth: a.endMonth,
          fte: a.fte,
        });
      }
    }
  }

  // 5. Stawki godzinowe.
  for (const r of POSITION_RATES) {
    const positionId = positionIdByName.get(r.position);
    if (!positionId) continue;
    await client.query(
      `INSERT INTO "PositionRate" (id, "positionId", "hourlyRate", "validFrom", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3::date, now())
       ON CONFLICT ("positionId", "validFrom") DO UPDATE SET "hourlyRate" = EXCLUDED."hourlyRate"`,
      [positionId, r.hourlyRate, r.validFrom]
    );
  }
  for (const r of EMPLOYEE_RATES) {
    const userId = userIdByEmail.get(r.email);
    if (!userId) continue;
    await client.query(
      `INSERT INTO "EmployeeRate" (id, "userId", "hourlyRate", "validFrom", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3::date, now())
       ON CONFLICT ("userId", "validFrom") DO UPDATE SET "hourlyRate" = EXCLUDED."hourlyRate"`,
      [userId, r.hourlyRate, r.validFrom]
    );
  }

  // 6. Flaga konfliktu — liczona tą samą regułą co w aplikacji: konflikt, gdy
  //    suma FTE pracownika w którymkolwiek miesiącu przekracza 1.0.
  let conflicts = 0;
  for (const userId of new Set(createdAssignments.map((a) => a.userId))) {
    const mine = createdAssignments.filter((a) => a.userId === userId);
    const flags = computeAssignmentConflicts(mine);
    for (const a of mine) {
      const isConflict = flags.get(a.id) ?? false;
      if (isConflict) conflicts++;
      await client.query(`UPDATE "Assignment" SET "isConflict" = $1 WHERE id = $2`, [
        isConflict,
        a.id,
      ]);
    }
  }

  await client.query("COMMIT");

  console.log("✅ Dane demo wgrane.");
  console.log(`   Stanowiska:   ${positionNames.length}`);
  console.log(`   Kompetencje:  ${skillNames.length}`);
  console.log(`   Stawki:       ${POSITION_RATES.length} stanowiskowych, ${EMPLOYEE_RATES.length} osobowych`);
  console.log(`   Pracownicy:   ${EMPLOYEES.length}`);
  console.log(`   Projekty:     ${PROJECTS.length}`);
  console.log(`   Przydziały:   ${createdAssignments.length} (konfliktowe: ${conflicts})`);
  console.log("");
  console.log("   Logowanie (hasło dla wszystkich kont demo: Demo1234):");
  console.log("     admin@demo.pl        — administrator");
  console.log("     kadry@demo.pl        — administracja (słowniki i stawki)");
  console.log("     manager@demo.pl      — menedżer");
  console.log("     m.nowak@test.com     — pracownik (ma konflikt obłożenia)");
  console.log("     oczekujacy@test.com  — konto oczekujące → ekran /pending");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
