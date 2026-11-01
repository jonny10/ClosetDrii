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

    it("retorna a categoria por id", async () => {
        const res = await request(app).get("/api/categorias/1");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: 1,
            nome: "Vestidos",
            descricao: expect.any(String),
        });
    });

    it("retorna 404 para categoria inexistente", async () => {
        const res = await request(app).get("/api/categorias/999");
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: "Categoria não encontrada",
        });
    });
});

describe("Admin: CRUD /api/admin/categorias", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

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

    it("401 sem sessão", async () => {
        const res = await request(app)
            .post("/api/admin/categorias")
            .send({ nome: "Nova", descricao: "Desc" });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("403 para cliente logado", async () => {
        const agente = await loginCliente();
        const res = await agente
            .post("/api/admin/categorias")
            .send({ nome: "Nova", descricao: "Desc" });
        expect(res.status).toBe(403);
    });

    it("201 cria categoria", async () => {
        const agente = await loginAdmin();
        const res = await agente
            .post("/api/admin/categorias")
            .send({ nome: "Bolsas", descricao: "Bolsas e carteiras" });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ id: 6, nome: "Bolsas", descricao: "Bolsas e carteiras" });
    });

    it("400 sem nome ou descrição", async () => {
        const agente = await loginAdmin();

        const resVazio = await agente.post("/api/admin/categorias").send({});
        expect(resVazio.status).toBe(400);
        expect(resVazio.body).toEqual({ error: "Nome é obrigatório" });

        const resSemDesc = await agente
            .post("/api/admin/categorias")
            .send({ nome: "Bolsas" });
        expect(resSemDesc.status).toBe(400);
        expect(resSemDesc.body).toEqual({ error: "Descrição é obrigatória" });
    });

    it("409 com nome duplicado", async () => {
        const agente = await loginAdmin();
        const res = await agente
            .post("/api/admin/categorias")
            .send({ nome: "Vestidos", descricao: "Outra descrição" });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Categoria já existe" });
    });

    it("200 atualiza parcialmente", async () => {
        const agente = await loginAdmin();
        const res = await agente
            .patch("/api/admin/categorias/6")
            .send({ nome: "Bolsas e Acessórios" });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 6, nome: "Bolsas e Acessórios" });
    });

    it("409 ao renomear para um nome existente", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/categorias/6").send({ nome: "Vestidos" });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Categoria já existe" });
    });

    it("400 atualiza sem campos", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/categorias/6").send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Nenhum campo para atualizar" });
    });

    it("404 atualiza categoria inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/categorias/999").send({ nome: "X" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Categoria não encontrada" });
    });

    it("200 remove categoria sem produtos", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/categorias/6");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 6 });
    });

    it("409 remove categoria com produtos vinculados", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/categorias/1");

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Categoria possui produtos vinculados" });
    });

    it("404 remove categoria inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/categorias/999");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Categoria não encontrada" });
    });
});
