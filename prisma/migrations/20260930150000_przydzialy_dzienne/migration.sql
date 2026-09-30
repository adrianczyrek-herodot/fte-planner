-- Okresy ról i przydziałów przechodzą z całych miesięcy na konkretne dni.
--
-- Migracja jest pisana ręcznie, bo wygenerowana automatycznie zrzuciłaby stare
-- kolumny razem z danymi. Tutaj najpierw przenosimy wartości: miesiąc początkowy
-- staje się jego pierwszym dniem, a miesiąc końcowy — ostatnim. Zakres zostaje
-- więc taki sam, jaki był w praktyce, tylko wyrażony dokładniej.

-- --- ProjectRole ---
ALTER TABLE "ProjectRole" ADD COLUMN "startDate" DATE;
ALTER TABLE "ProjectRole" ADD COLUMN "endDate" DATE;

UPDATE "ProjectRole"
SET "startDate" = to_date("startMonth" || '-01', 'YYYY-MM-DD'),
    "endDate"   = (to_date("endMonth" || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 day')::date;

ALTER TABLE "ProjectRole" ALTER COLUMN "startDate" SET NOT NULL;
ALTER TABLE "ProjectRole" ALTER COLUMN "endDate" SET NOT NULL;
ALTER TABLE "ProjectRole" DROP COLUMN "startMonth";
ALTER TABLE "ProjectRole" DROP COLUMN "endMonth";

-- --- Assignment ---
ALTER TABLE "Assignment" ADD COLUMN "startDate" DATE;
ALTER TABLE "Assignment" ADD COLUMN "endDate" DATE;

UPDATE "Assignment"
SET "startDate" = to_date("startMonth" || '-01', 'YYYY-MM-DD'),
    "endDate"   = (to_date("endMonth" || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 day')::date;

ALTER TABLE "Assignment" ALTER COLUMN "startDate" SET NOT NULL;
ALTER TABLE "Assignment" ALTER COLUMN "endDate" SET NOT NULL;
ALTER TABLE "Assignment" DROP COLUMN "startMonth";
ALTER TABLE "Assignment" DROP COLUMN "endMonth";
