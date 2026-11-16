import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /signup (cadastro)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("visitante vê o formulário de cadastro com os campos esperados", async () => {
        const res = await request(app).get("/signup");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Crie sua conta");
        expect(res.text).toContain('id="cadastro-form"');
        expect(res.text).toContain('id="name"');
        expect(res.text).toContain('id="email"');
        expect(res.text).toContain('id="phone"');
        expect(res.text).toContain('id="password"');
        expect(res.text).toContain('id="confirmPassword"');
        // aceite de termos obrigatório
        expect(res.text).toContain('id="terms"');
        // link pra quem já tem conta
        expect(res.text).toContain('href="/login"');
    });
});
