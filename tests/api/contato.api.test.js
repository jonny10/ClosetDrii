import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize, Contato } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

// Ana Paula (id 4) é cliente no seed; Fabricio (id 2) é admin
async function loginCliente() {
    const agente = request.agent(app);
    const res = await agente
        .post("/api/auth/login")
        .send({ email: "ana.paula@email.com", senha: "123456" });
    expect(res.status).toBe(200);
    return agente;
}

async function loginAdmin() {
    const agente = request.agent(app);
    const res = await agente
        .post("/api/auth/login")
        .send({ email: "fabricio@email.com", senha: "123456" });
    expect(res.status).toBe(200);
    return agente;
}

describe("POST /api/contatos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("201 cria a mensagem do formulário público (sem sessão)", async () => {
        const res = await request(app).post("/api/contatos").send({
            nome: "Maria Silva",
            email: "maria.silva@email.com",
            assunto: "duvidas_produto",
            mensagem: "Qual a composição do tecido?",
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            nome: "Maria Silva",
            email: "maria.silva@email.com",
            assunto: "duvidas_produto",
            mensagem: "Qual a composição do tecido?",
            respondida: false,
        });
        expect(res.body.id).toBeGreaterThan(5); // 5 mensagens no seed

        const noBanco = await Contato.findByPk(res.body.id);
        expect(noBanco.respondida).toBe(false);
    });

    it("400 sem campos obrigatórios", async () => {
        const res = await request(app).post("/api/contatos").send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Nome é obrigatório" });

        const resEmail = await request(app).post("/api/contatos").send({
            nome: "Maria",
            email: "",
            assunto: "outros",
            mensagem: "oi",
        });
        expect(resEmail.status).toBe(400);
        expect(resEmail.body).toEqual({ error: "E-mail é obrigatório" });

        const resAssunto = await request(app).post("/api/contatos").send({
            nome: "Maria",
            email: "maria@email.com",
            assunto: "   ",
            mensagem: "oi",
        });
        expect(resAssunto.status).toBe(400);
        expect(resAssunto.body).toEqual({ error: "Assunto é obrigatório" });

        const resMensagem = await request(app).post("/api/contatos").send({
            nome: "Maria",
            email: "maria@email.com",
            assunto: "outros",
            mensagem: "   ",
        });
        expect(resMensagem.status).toBe(400);
        expect(resMensagem.body).toEqual({ error: "Mensagem é obrigatória" });
    });

    it("400 com e-mail inválido", async () => {
        const res = await request(app).post("/api/contatos").send({
            nome: "Maria",
            email: "nao-e-email",
            assunto: "outros",
            mensagem: "oi",
        });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "E-mail inválido" });
    });
});

describe("GET /api/admin/contatos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app).get("/api/admin/contatos");
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("403 para cliente logado", async () => {
        const agente = await loginCliente();
        const res = await agente.get("/api/admin/contatos");
        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Acesso restrito a administradores" });
    });

    it("200 lista as mensagens mais recentes primeiro (admin)", async () => {
        const criada = await request(app).post("/api/contatos").send({
            nome: "Nova Mensagem",
            email: "nova@email.com",
            assunto: "outros",
            mensagem: "recém-chegada",
        });
        expect(criada.status).toBe(201);

        const agente = await loginAdmin();
        const res = await agente.get("/api/admin/contatos");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(6); // 5 do seed + 1 criada
        expect(res.body[0].id).toBe(criada.body.id); // mais recente primeiro
        expect(res.body[0].respondida).toBe(false);
    });
});

describe("PATCH /api/admin/contatos/:id", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app).patch("/api/admin/contatos/1").send({});
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("403 para cliente logado", async () => {
        const agente = await loginCliente();
        const res = await agente.patch("/api/admin/contatos/1").send({});
        expect(res.status).toBe(403);
    });

    it("200 marca como respondida (sem body, default true)", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/contatos/1").send({});

        expect(res.status).toBe(200);
        expect(res.body.respondida).toBe(true);

        const noBanco = await Contato.findByPk(1);
        expect(noBanco.respondida).toBe(true);
    });

    it("200 desmarca com { respondida: false }", async () => {
        const agente = await loginAdmin();

        const marcada = await agente.patch("/api/admin/contatos/2").send({});
        expect(marcada.status).toBe(200);

        const res = await agente.patch("/api/admin/contatos/2").send({ respondida: false });

        expect(res.status).toBe(200);
        expect(res.body.respondida).toBe(false);

        const noBanco = await Contato.findByPk(2);
        expect(noBanco.respondida).toBe(false);
    });

    it("400 com respondida não-booleano", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/contatos/1").send({ respondida: "sim" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Campo respondida deve ser booleano" });
    });

    it("404 para contato inexistente ou id inválido", async () => {
        const agente = await loginAdmin();

        const res = await agente.patch("/api/admin/contatos/999").send({});
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Contato não encontrado" });

        const resInvalido = await agente.patch("/api/admin/contatos/abc").send({});
        expect(resInvalido.status).toBe(404);
        expect(resInvalido.body).toEqual({ error: "Contato não encontrado" });
    });
});
