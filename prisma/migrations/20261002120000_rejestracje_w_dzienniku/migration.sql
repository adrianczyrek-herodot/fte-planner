-- Zatwierdzenie i odrzucenie rejestracji jako osobne zdarzenia w dzienniku.
-- Wcześniej zatwierdzenie zapisywało się jako „Aktywacja konta" — tak samo jak
-- przywrócenie dezaktywowanego pracownika — a odrzucenia nie było wcale.
ALTER TYPE "AuditAction" ADD VALUE 'registration_approved';
ALTER TYPE "AuditAction" ADD VALUE 'registration_rejected';
