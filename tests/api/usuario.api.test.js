import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize, Usuario } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");
const bcrypt = require("bcrypt");

describe("POST /api/auth/signup", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("cria usuário cliente e não devolve a senha", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ nome: "Teste Silva", email: "teste@signup.com", senha: "senha123" });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            id: expect.any(Number),
            nome: "Teste Silva",
            email: "teste@signup.com",
            perfil: "cliente",
        });
        expect(res.body).not.toHaveProperty("senha");
    });

    it("grava a senha com hash bcrypt no banco", async () => {
        await request(app)
            .post("/api/auth/signup")
            .send({ nome: "Hash Teste", email: "hash@signup.com", senha: "senha123" });

        const usuario = await Usuario.findOne({ where: { email: "hash@signup.com" } });

        expect(usuario.senha).not.toBe("senha123");
        expect(usuario.senha.startsWith("$2b$")).toBe(true);
        expect(await bcrypt.compare("senha123", usuario.senha)).toBe(true);
    });

    it("400 sem nome", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ email: "sem.nome@signup.com", senha: "senha123" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Nome é obrigatório" });
    });

    it("400 para email inválido", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ nome: "Email Ruim", email: "nao-e-email", senha: "senha123" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Email inválido" });
    });

    it("400 para senha com menos de 6 caracteres", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ nome: "Senha Curta", email: "curta@signup.com", senha: "12345" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Senha deve ter no mínimo 6 caracteres" });
    });

    it("409 para email já cadastrado", async () => {
        await request(app)
            .post("/api/auth/signup")
            .send({ nome: "Duplicado", email: "dup@signup.com", senha: "senha123" });

        const res = await request(app)
            .post("/api/auth/signup")
            .send({ nome: "Duplicado 2", email: "dup@signup.com", senha: "outrasenha" });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Email já cadastrado" });
    });
});

describe("POST /api/auth/login", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("loga usuário do seed e cria a sessão (cookie)", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "fabricio@email.com", senha: "123456" });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ email: "fabricio@email.com", perfil: "admin" });
        expect(res.body).not.toHaveProperty("senha");
        expect(res.headers["set-cookie"]).toBeDefined();
        expect(res.headers["set-cookie"].some((c) => c.includes("connect.sid="))).toBe(true);
    });

    it("400 sem email ou senha", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: "fabricio@email.com" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Email e senha são obrigatórios" });
    });

    it("401 para email inexistente", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "nao.existe@login.com", senha: "123456" });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Email inválido" });
    });

    it("401 para senha errada", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "fabricio@email.com", senha: "senha-errada" });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Senha inválida" });
    });
});

describe("POST /api/auth/logout", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("destrói a sessão e expira o cookie", async () => {
        const agente = request.agent(app);
        const login = await agente.post("/api/auth/login").send({ email: "fabricio@email.com", senha: "123456" });
        expect(login.status).toBe(200);

        const res = await agente.post("/api/auth/logout");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "Logout realizado" });
        expect(res.headers["set-cookie"]).toBeDefined();
        expect(
            res.headers["set-cookie"].some((c) => c.includes("connect.sid=;") && c.includes("1970"))
        ).toBe(true);
    });

    it("200 mesmo sem sessão (idempotente)", async () => {
        const res = await request(app).post("/api/auth/logout");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "Logout realizado" });
    });
});
