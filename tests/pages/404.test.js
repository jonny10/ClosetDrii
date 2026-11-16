import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página 404", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("página inexistente cai na 404 renderizada", async () => {
        const res = await request(app).get("/nao-existe");

        expect(res.status).toBe(404);
        expect(res.text).toContain("Página não encontrada");
    });

    it("rota de API inexistente responde 404 JSON", async () => {
        const res = await request(app).get("/api/nao-existe");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Rota não encontrada" });
    });
});
