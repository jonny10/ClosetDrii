import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página / (home)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("visitante vê a vitrine renderizada no servidor", async () => {
        const res = await request(app).get("/");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Closet Drii");
        expect(res.text).toContain("Destaques da Semana");
        expect(res.text).toContain("Ofertas");
        // 4 cards de destaques + 4 de ofertas + 1 do <template> de clonagem do JS
        expect((res.text.match(/product-card-component/g) || []).length).toBe(9);
        // preços formatados pt-BR (ex.: R$ 129,90)
        expect((res.text.match(/R\$ \d+,\d{2}/g) || []).length).toBeGreaterThanOrEqual(8);
    });
});
