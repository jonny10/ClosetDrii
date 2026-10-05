import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        setupFiles: ["./tests/setup.js"], // DB_DIALECT=sqlite antes de importar a app
    },
});
