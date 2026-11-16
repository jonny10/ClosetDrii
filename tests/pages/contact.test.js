import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /contact (contato público)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("visitante vê o formulário de contato com os campos esperados", async () => {
        const res = await request(app).get("/contact");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Fale Conosco");
        expect(res.text).toContain('id="contact-store-form"');
        expect(res.text).toContain('id="contact-nome"');
        expect(res.text).toContain('id="contact-email"');
        expect(res.text).toContain('id="contact-assunto"');
        expect(res.text).toContain('id="contact-mensagem"');
        // opções de assunto do select
        expect(res.text).toContain("Status do meu Pedido");
        expect(res.text).toContain("Trocas e Devoluções");
        // infos de atendimento
        expect(res.text).toContain("contato@closetdrii.com.br");
        expect(res.text).toContain("(19) 99999-9999");
    });
});
