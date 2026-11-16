import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

import { agenteLogado, CLIENTE, ADMIN } from "./helpers.js";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /contact_adm (contatos do admin)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("sem sessão redireciona para /login", async () => {
        const res = await request(app).get("/contact_adm");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("cliente logado é barrado (requireAdmin) → 302 /", async () => {
        const cliente = await agenteLogado(app, CLIENTE);

        const res = await cliente.get("/contact_adm");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/");
    });

    it("admin vê os cards de contato renderizados no servidor (sem template)", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const res = await admin.get("/contact_adm");

        expect(res.status).toBe(200);
        // 5 contatos do seed renderizados pelo {{#each}} do Handlebars
        expect((res.text.match(/class="message-card"/g) || []).length).toBe(5);
        expect(res.text).not.toContain("template-message-card");
        expect(res.text).toContain("Leticia Moura");
        expect(res.text).toContain("Renata Figueiredo");
        // todos os contatos do seed estão pendentes → 5 botões de marcar como respondida
        expect((res.text.match(/Marcar como Respondida/g) || []).length).toBe(5);
        // badge com classe e label formatados pelo controller (ex.: "Parceria")
        expect(res.text).toContain("subject-parceria");
    });
});
