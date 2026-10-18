import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("páginas renderizadas", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("home renderiza com os cards de produtos do banco", async () => {
        const res = await request(app).get("/");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Closet Drii");
        expect(res.text).toContain("Destaques da Semana");
        // 4 cards reais (destaques) + 1 do <template> de clonagem do JS
        expect((res.text.match(/product-card-component/g) || []).length).toBe(5);
        // preços formatados pt-BR (ex.: R$ 129,90)
        expect((res.text.match(/R\$ \d+,\d{2}/g) || []).length).toBeGreaterThanOrEqual(4);
    });

    it.each(["/about", "/contact", "/login", "/signup", "/profile", "/historico", "/dados", "/produtos", "/catalogo", "/cart", "/vendas", "/contact_adm"])(
        "GET %s responde 200",
        async (rota) => {
            const res = await request(app).get(rota);
            expect(res.status).toBe(200);
        }
    );

    it("página inexistente cai na 404", async () => {
        const res = await request(app).get("/nao-existe");

        expect(res.status).toBe(404);
        expect(res.text).toContain("Página não encontrada");
    });
});
