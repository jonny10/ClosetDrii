import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

// require nativo: garante a MESMA instância dos models usada pela app
// (import ESM + require CJS do mesmo arquivo duplicaria o registro do Sequelize)
const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("GET /api/produtos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("lista todos os produtos com categoria e variantes", async () => {
        const res = await request(app).get("/api/produtos");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(20);

        const vestido = res.body.find((p) => p.id === 1);
        expect(vestido).toMatchObject({
            nome: "Vestido Floral Midi",
            descricao: expect.any(String),
            preco: 189.9, // Number, não string formatada
            categoria: { id: 1, nome: "Vestidos" },
        });
        expect(vestido.variantes).toHaveLength(3);
    });

    it("filtra por categoria (nome exato)", async () => {
        const res = await request(app).get("/api/produtos").query({ categoria: "Vestidos" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(5);
        res.body.forEach((p) => expect(p.categoria.nome).toBe("Vestidos"));
    });

    it("busca por nome (like)", async () => {
        const res = await request(app).get("/api/produtos").query({ busca: "jeans" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        res.body.forEach((p) => expect(p.nome.toLowerCase()).toContain("jeans"));
    });

    it("ordena por preço desc", async () => {
        const res = await request(app).get("/api/produtos").query({ orderBy: "preco", dir: "desc" });

        expect(res.status).toBe(200);
        const precos = res.body.map((p) => p.preco);
        expect(precos[0]).toBe(299.9); // Vestido Longo Boho
        expect(precos[precos.length - 1]).toBe(49.9); // Blusa Regata Básica
    });
});

describe("GET /api/produtos/:id", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("retorna o detalhe com categoria e variantes", async () => {
        const res = await request(app).get("/api/produtos/1");

        expect(res.status).toBe(200);
        expect(res.body.nome).toBe("Vestido Floral Midi");
        expect(res.body.categoria).toEqual({ id: 1, nome: "Vestidos" });
        expect(res.body.variantes).toHaveLength(3);
        // a ordem do include não é garantida — busca por valor
        const rosaP = res.body.variantes.find((v) => v.cor === "Rosa" && v.tamanho === "P");
        expect(rosaP).toMatchObject({ estoque: 5 });
    });

    it("404 JSON para produto inexistente", async () => {
        const res = await request(app).get("/api/produtos/999");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Produto não encontrado" });
    });
});

describe("GET /api/produtos/:id/variantes", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("lista só as variantes do produto", async () => {
        const res = await request(app).get("/api/produtos/1/variantes");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);
        // o service ordena por id ASC — primeira é a Rosa P
        expect(res.body[0]).toMatchObject({ cor: "Rosa", tamanho: "P", estoque: 5 });
        res.body.forEach((v) => expect(typeof v.estoque).toBe("number"));
    });

    it("404 se o produto não existir", async () => {
        const res = await request(app).get("/api/produtos/999/variantes");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Produto não encontrado" });
    });
});
