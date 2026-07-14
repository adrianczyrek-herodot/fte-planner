import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

// Testy integracyjne — uderzają w prawdziwą bazę (DATABASE_URL z .env).
// Uruchamianie: `npm run test:integration` (najpierw wystartuj kontener Postgres).
dotenv.config({ quiet: true });

export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    // Wspólna baza — nie zrównoleglamy plików, żeby testy się nie przeplatały.
    fileParallelism: false,
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
