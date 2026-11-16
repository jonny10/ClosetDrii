import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /produtos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("visitante vê os cards e os filtros renderizados no servidor (sem template)", async () => {
        const res = await request(app).get("/produtos");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Nossa Coleção");
        // 20 produtos do seed renderizados pelo {{#each}} — sem <template> de clonagem
        expect((res.text.match(/class="product-card-component"/g) || []).length).toBe(20);
        expect(res.text).not.toContain("template-card");
        expect(res.text).toContain("Vestido Floral Midi");
        // 5 checkboxes de categoria server-rendered (além do "Todos" estático)
        expect((res.text.match(/class="category-checkbox"/g) || []).length).toBe(5);
        expect(res.text).toContain('data-name="vestidos"');
        // chips de tamanho vêm da tabela `tamanhos` (8 siglas do seed, sem hardcode)
        expect((res.text.match(/class="size-chip"/g) || []).length).toBe(8);
    });
});
