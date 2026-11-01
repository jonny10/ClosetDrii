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

describe("PATCH /api/usuarios/me", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    async function agenteLogado(email, senha) {
        const agente = request.agent(app);
        const login = await agente.post("/api/auth/login").send({ email, senha });
        expect(login.status).toBe(200);
        return agente;
    }

    it("401 sem sessão", async () => {
        const res = await request(app).patch("/api/usuarios/me").send({ nome: "X" });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("atualiza os dados do usuário logado e devolve o usuário formatado", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const res = await cliente.patch("/api/usuarios/me").send({
            nome: "Ana Paula F. Silva",
            telefone: "(11) 98765-4321",
            cpf: "123.456.789-04",
            dt_nascimento: "1998-01-20",
            genero: "F",
        });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            id: 4,
            nome: "Ana Paula F. Silva",
            email: "ana.paula@email.com",
            telefone: "11987654321",
            cpf: "12345678904",
            dt_nascimento: "1998-01-20",
            genero: "F",
        });
        expect(res.body).not.toHaveProperty("senha");

        const noBanco = await Usuario.findByPk(4);
        expect(noBanco.nome).toBe("Ana Paula F. Silva");
        expect(noBanco.telefone).toBe("11987654321");
        expect(noBanco.cpf).toBe("12345678904");
    });

    it("atualização parcial altera só os campos enviados", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const res = await cliente.patch("/api/usuarios/me").send({ nome: "Ana P." });

        expect(res.status).toBe(200);
        expect(res.body.nome).toBe("Ana P.");
        expect(res.body.email).toBe("ana.paula@email.com");
        // campos não enviados permanecem como estavam
        expect(res.body.cpf).toBe("12345678904");
        expect(res.body.genero).toBe("F");
    });

    it("limpa campo opcional quando enviado vazio", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const res = await cliente.patch("/api/usuarios/me").send({ cpf: "", dt_nascimento: "" });

        expect(res.status).toBe(200);
        expect(res.body.cpf).toBeNull();
        expect(res.body.dt_nascimento).toBeNull();

        const noBanco = await Usuario.findByPk(4);
        expect(noBanco.cpf).toBeNull();
        expect(noBanco.dt_nascimento).toBeNull();
    });

    it("400 para nome vazio", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const res = await cliente.patch("/api/usuarios/me").send({ nome: "   " });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Nome é obrigatório" });
    });

    it("400 para cpf fora do padrão de 11 dígitos", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const res = await cliente.patch("/api/usuarios/me").send({ cpf: "123" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "CPF deve ter 11 dígitos" });
    });

    it("400 para telefone inválido", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const res = await cliente.patch("/api/usuarios/me").send({ telefone: "123" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Telefone inválido" });
    });

    it("400 para data de nascimento inválida", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const res = await cliente.patch("/api/usuarios/me").send({ dt_nascimento: "20-01-1998" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Data de nascimento inválida (use AAAA-MM-DD)" });
    });

    it("400 para gênero fora da lista", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const res = await cliente.patch("/api/usuarios/me").send({ genero: "X" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Gênero inválido" });
    });

    it("400 para campo não permitido (whitelist)", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const res = await cliente.patch("/api/usuarios/me").send({ email: "hacker@email.com" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Campo não permitido: email" });
    });

    it("mantém o snapshot da sessão sincronizado após o PATCH", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const patch = await cliente.patch("/api/usuarios/me").send({ nome: "Ana Renomeada" });
        expect(patch.status).toBe(200);

        // header server-rendered usa o snapshot da sessão — deve refletir o novo nome
        const perfil = await cliente.get("/profile");
        expect(perfil.status).toBe(200);
        expect(perfil.text).toContain("Ana Renomeada");
    });
});
