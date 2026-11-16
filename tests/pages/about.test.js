import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /about (sobre)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("visitante vê a história e os pilares da marca", async () => {
        const res = await request(app).get("/about");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Conheça o Closet Drii");
        expect(res.text).toContain("Como tudo começou");
        expect(res.text).toContain("Nossos Pilares");
        // 3 cards de valores
        expect((res.text.match(/class="value-card"/g) || []).length).toBe(3);
        expect(res.text).toContain("Autoestima");
        expect(res.text).toContain("Exclusividade");
        expect(res.text).toContain("Qualidade");
        // CTA leva pro catálogo
        expect(res.text).toContain('href="/produtos"');
    });
});
