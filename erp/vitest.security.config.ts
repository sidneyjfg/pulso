import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.security.test.ts"],
    passWithNoTests: true
  }
});
