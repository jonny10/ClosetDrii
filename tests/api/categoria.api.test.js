import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("GET /api/categorias", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("lista as categorias ordenadas por nome", async () => {
        const res = await request(app).get("/api/categorias");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(5);
        expect(res.body.map((c) => c.nome)).toEqual([
            "Acessórios",
            "Blusas",
            "Calças",
            "Saias",
            "Vestidos",
        ]);
        expect(res.body[0]).toMatchObject({
            id: expect.any(Number),
            descricao: expect.any(String),
        });
    });
});
