import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // Pool MySQL dibuat lazy; koneksi tidak dibuka selama unit test.
      DATABASE_URL: process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/lenbee_test",
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/server-only-stub.ts"),
    },
  },
});
