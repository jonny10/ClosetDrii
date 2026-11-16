import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /login", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("visitante vê o formulário de login com os campos esperados", async () => {
        const res = await request(app).get("/login");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Faça login para acessar sua conta");
        expect(res.text).toContain('id="login-form"');
        // PITFALL do repo: o campo de senha usa id #password (não #senha)
        expect(res.text).toContain('id="email"');
        expect(res.text).toContain('id="password"');
        expect(res.text).toContain('type="submit"');
        // link de cadastro presente
        expect(res.text).toContain('href="/signup"');
    });

    it("visitante vê as ações de guest no header (Login/Cadastrar-se)", async () => {
        const res = await request(app).get("/login");

        expect(res.status).toBe(200);
        expect(res.text).toContain('href="/login"');
        expect(res.text).toContain('href="/signup"');
        expect(res.text).not.toContain("nav-profile-btn");
    });
});
