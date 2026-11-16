import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

import { agenteLogado, CLIENTE, ADMIN } from "./helpers.js";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /profile (perfil)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("sem sessão redireciona para /login", async () => {
        const res = await request(app).get("/profile");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("cliente logado vê os dados mascarados e o select de gênero marcado", async () => {
        const cliente = await agenteLogado(app, CLIENTE);

        const res = await cliente.get("/profile");

        expect(res.status).toBe(200);
        // nome/e-mail na sidebar de conta
        expect(res.text).toContain("Ana Paula Ferreira");
        expect(res.text).toContain("ana.paula@email.com");
        // valores já preenchidos e mascarados nos inputs (telefone 11 dígitos e CPF)
        expect(res.text).toContain("(11) 98765-0004");
        expect(res.text).toContain("123.456.789-04");
        // select de gênero com a opção F marcada
        expect(res.text).toMatch(/<option value="F" [^>]*selected>Feminino<\/option>/);
        // foto editável só no perfil (input de arquivo presente)
        expect(res.text).toContain('id="file-input"');
    });

    it("admin logado também acessa o próprio perfil", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const res = await admin.get("/profile");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Fabricio Onofre");
    });

    it("após logout, volta a redirecionar para /login", async () => {
        const cliente = await agenteLogado(app, CLIENTE);

        const logout = await cliente.post("/api/auth/logout");
        expect(logout.status).toBe(200);

        const res = await cliente.get("/profile");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });
});
