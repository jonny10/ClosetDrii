import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

async function loginAdmin() {
    const agente = request.agent(app);
    const res = await agente
        .post("/api/auth/login")
        .send({ email: "fabricio@email.com", senha: "123456" });
    expect(res.status).toBe(200);
    return agente;
}

async function loginCliente() {
    const agente = request.agent(app);
    const res = await agente
        .post("/api/auth/login")
        .send({ email: "ana.paula@email.com", senha: "123456" });
    expect(res.status).toBe(200);
    return agente;
}

describe("GET /api/tamanhos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("lista os tamanhos na ordem de exibição", async () => {
        const res = await request(app).get("/api/tamanhos");

        expect(res.status).toBe(200);
        expect(res.body.map((t) => t.nome)).toEqual(["P", "M", "G", "GG", "U", "36", "38", "40"]);
        expect(res.body[0]).toMatchObject({ id: 1, ordem: 1 });
    });
});

describe("Admin: CRUD /api/admin/tamanhos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app)
            .post("/api/admin/tamanhos")
            .send({ nome: "44", ordem: 9 });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("403 para cliente logado", async () => {
        const agente = await loginCliente();
        const res = await agente.post("/api/admin/tamanhos").send({ nome: "44", ordem: 9 });
        expect(res.status).toBe(403);
    });

    it("201 cria tamanho", async () => {
        const agente = await loginAdmin();
        const res = await agente.post("/api/admin/tamanhos").send({ nome: "44", ordem: 9 });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ id: 9, nome: "44", ordem: 9 });
    });

    it("400 sem nome ou nome longo demais", async () => {
        const agente = await loginAdmin();

        const resVazio = await agente.post("/api/admin/tamanhos").send({});
        expect(resVazio.status).toBe(400);
        expect(resVazio.body).toEqual({ error: "Nome é obrigatório" });

        const resLongo = await agente.post("/api/admin/tamanhos").send({ nome: "X".repeat(11) });
        expect(resLongo.status).toBe(400);
        expect(resLongo.body).toEqual({ error: "Nome deve ter no máximo 10 caracteres" });
    });

    it("409 com sigla duplicada", async () => {
        const agente = await loginAdmin();
        const res = await agente.post("/api/admin/tamanhos").send({ nome: "P" });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Tamanho já existe" });
    });

    it("200 atualiza parcialmente", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/tamanhos/9").send({ ordem: 10 });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 9, ordem: 10 });
    });

    it("409 ao renomear para uma sigla existente", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/tamanhos/9").send({ nome: "M" });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Tamanho já existe" });
    });

    it("400 atualiza sem campos", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/tamanhos/9").send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Nenhum campo para atualizar" });
    });

    it("404 atualiza tamanho inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/tamanhos/999").send({ ordem: 1 });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Tamanho não encontrado" });
    });

    it("200 remove tamanho sem uso", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/tamanhos/9");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 9 });
    });

    it("409 remove tamanho em uso por variantes", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/tamanhos/1");

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Tamanho em uso por variantes" });
    });

    it("404 remove tamanho inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/tamanhos/999");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Tamanho não encontrado" });
    });
});
