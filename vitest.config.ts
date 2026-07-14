import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testy jednostkowe — czyste, bez bazy (bezpieczne w CI / na Vercelu).
// Integracyjne (*.integration.test.ts) są tu wykluczone; uruchamia je
// `npm run test:integration` (wymaga działającej bazy).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
