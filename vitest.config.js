import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    // Vitest não faz build/serve de assets: desativa a checagem do Vite que
    // bloqueia imports de arquivos dentro de public/ (scripts de página usam /js/...).
    publicDir: false,
    test: {
        environment: "node",
        setupFiles: ["./tests/setup.js"],
    },
    resolve: {
        // Scripts de página importam de caminhos absolutos (ex.: /js/global/snackbar.js)
        alias: [{ find: "/js", replacement: path.resolve(__dirname, "public/js") }],
    },
});
