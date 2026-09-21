-- Słowniki globalne stanowisk i kompetencji + czwarta rola (administracja).
--
-- Migracja jest napisana ręcznie, bo poza zmianą schematu musi PRZENIEŚĆ dane:
-- stanowiska i kompetencje istnieją dziś jako wolny tekst na pracownikach i na
-- rolach w projektach. Kolejność ma znaczenie — stare kolumny kasujemy dopiero
-- po przepisaniu wartości do słowników.

-- 1. Nowa wartość w enumie roli.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'finance' BEFORE 'admin';

-- 2. Tabele słownikowe.
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_SkillToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SkillToUser_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");
CREATE INDEX "_SkillToUser_B_index" ON "_SkillToUser"("B");

-- 3. Nowe kolumny FK — na razie dopuszczają NULL, żeby dało się je wypełnić.
ALTER TABLE "User" ADD COLUMN "positionId" TEXT;
ALTER TABLE "ProjectRole" ADD COLUMN "positionId" TEXT;

-- 4. Słownik stanowisk z obu źródeł naraz, z deduplikacją i bez pustych.
INSERT INTO "Position" ("id", "name", "updatedAt")
SELECT gen_random_uuid()::text, nazwa, now()
FROM (
    SELECT DISTINCT btrim(position) AS nazwa
    FROM "User"
    WHERE position IS NOT NULL AND btrim(position) <> ''
    UNION
    SELECT DISTINCT btrim(position) AS nazwa
    FROM "ProjectRole"
    WHERE btrim(position) <> ''
) AS zrodla;

-- 5. Słownik kompetencji z tablicy tagów.
INSERT INTO "Skill" ("id", "name", "updatedAt")
SELECT gen_random_uuid()::text, nazwa, now()
FROM (
    SELECT DISTINCT btrim(s) AS nazwa
    FROM "User", unnest("skills") AS s
    WHERE btrim(s) <> ''
) AS zrodla;

-- 6. Podmiana tekstu na referencje.
UPDATE "User" u
SET "positionId" = p."id"
FROM "Position" p
WHERE btrim(u."position") = p."name";

UPDATE "ProjectRole" r
SET "positionId" = p."id"
FROM "Position" p
WHERE btrim(r."position") = p."name";

INSERT INTO "_SkillToUser" ("A", "B")
SELECT DISTINCT s."id", u."id"
FROM "User" u
CROSS JOIN LATERAL unnest(u."skills") AS tag
JOIN "Skill" s ON s."name" = btrim(tag);

-- 7. Rola w projekcie musi mieć stanowisko. Jeśli któraś nie dostała
--    referencji (pusty tekst), migracja ma się zatrzymać, a nie cicho zepsuć
--    dane — dlatego NOT NULL zakładamy przed skasowaniem starych kolumn.
ALTER TABLE "ProjectRole" ALTER COLUMN "positionId" SET NOT NULL;

-- 8. Stare kolumny tekstowe znikają.
ALTER TABLE "User" DROP COLUMN "position";
ALTER TABLE "User" DROP COLUMN "skills";
ALTER TABLE "ProjectRole" DROP COLUMN "position";

-- 9. Więzy i indeksy.
CREATE INDEX "User_positionId_idx" ON "User"("positionId");
CREATE INDEX "ProjectRole_positionId_idx" ON "ProjectRole"("positionId");

ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectRole" ADD CONSTRAINT "ProjectRole_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_SkillToUser" ADD CONSTRAINT "_SkillToUser_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_SkillToUser" ADD CONSTRAINT "_SkillToUser_B_fkey"
    FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
